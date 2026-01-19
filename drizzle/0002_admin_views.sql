-- ============================================
-- 管理员友好视图和函数
-- 在 Supabase SQL Editor 中执行
-- ============================================

-- 1. 用户积分总览视图（最常用）
CREATE OR REPLACE VIEW admin_users_overview AS
SELECT
  u.name AS "用户名",
  u.email AS "邮箱",
  u.phone AS "手机",
  COALESCE(k.quota_limit, 0) AS "总积分",
  COALESCE(k.quota_used, 0)::int AS "已用积分",
  COALESCE(k.quota_limit, 0) - COALESCE(k.quota_used, 0)::int AS "剩余积分",
  k.key_prefix AS "API Key前缀",
  k.status AS "Key状态",
  u.status AS "账户状态",
  u.provider AS "注册来源",
  u.created_at AS "注册时间",
  k.last_used_at AS "最后使用",
  -- 隐藏但可用于操作
  u.id AS "_user_id",
  k.id AS "_key_id"
FROM users u
LEFT JOIN api_keys k ON u.id = k.user_id
ORDER BY u.created_at DESC;

COMMENT ON VIEW admin_users_overview IS '用户积分总览 - 管理员常用视图';

-- 2. 交易记录视图
CREATE OR REPLACE VIEW admin_transactions AS
SELECT
  u.name AS "用户名",
  CASE ct.type
    WHEN 'consumption' THEN '消费'
    WHEN 'recharge' THEN '充值'
    WHEN 'refund' THEN '退款'
    WHEN 'reward' THEN '奖励'
  END AS "类型",
  CASE
    WHEN ct.amount > 0 THEN '-' || ct.amount
    ELSE '+' || ABS(ct.amount)
  END AS "积分变动",
  ct.balance_after AS "变动后余额",
  COALESCE(ct.service, '-') AS "服务",
  COALESCE(ct.provider, '-') AS "厂商",
  COALESCE(ct.model, '-') AS "模型",
  ct.description AS "描述",
  ct.created_at AS "时间",
  ct.id AS "_transaction_id",
  u.id AS "_user_id"
FROM credit_transactions ct
JOIN users u ON ct.user_id = u.id
ORDER BY ct.created_at DESC;

COMMENT ON VIEW admin_transactions IS '积分交易记录 - 按时间倒序';

-- 3. API 使用统计视图
CREATE OR REPLACE VIEW admin_usage_stats AS
SELECT
  u.name AS "用户名",
  ul.provider AS "厂商",
  COUNT(*) AS "调用次数",
  SUM(CASE WHEN ul.response_status >= 200 AND ul.response_status < 300 THEN 1 ELSE 0 END) AS "成功",
  SUM(CASE WHEN ul.response_status >= 400 THEN 1 ELSE 0 END) AS "失败",
  ROUND(AVG(ul.latency_ms)) AS "平均延迟ms",
  DATE(ul.created_at) AS "日期"
FROM usage_logs ul
JOIN users u ON ul.user_id = u.id
GROUP BY u.name, ul.provider, DATE(ul.created_at)
ORDER BY DATE(ul.created_at) DESC, u.name;

COMMENT ON VIEW admin_usage_stats IS 'API 使用统计 - 按用户/厂商/日期';

-- ============================================
-- 便捷操作函数
-- ============================================

-- 4. 按用户名充值（最常用）
CREATE OR REPLACE FUNCTION recharge_by_name(
  p_user_name TEXT,
  p_amount INT,
  p_description TEXT DEFAULT '管理员充值'
)
RETURNS TABLE (
  "结果" TEXT,
  "用户名" TEXT,
  "充值积分" INT,
  "新余额" INT
) AS $$
DECLARE
  v_user_id TEXT;
  v_key_id TEXT;
  v_old_limit INT;
  v_used REAL;
  v_new_balance INT;
BEGIN
  -- 查找用户
  SELECT u.id, k.id, COALESCE(k.quota_limit, 0), COALESCE(k.quota_used, 0)
  INTO v_user_id, v_key_id, v_old_limit, v_used
  FROM users u
  LEFT JOIN api_keys k ON u.id = k.user_id
  WHERE u.name = p_user_name
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT '失败: 用户不存在'::TEXT, p_user_name, 0, 0;
    RETURN;
  END IF;

  IF v_key_id IS NULL THEN
    RETURN QUERY SELECT '失败: 用户无API Key'::TEXT, p_user_name, 0, 0;
    RETURN;
  END IF;

  -- 更新配额
  UPDATE api_keys SET quota_limit = v_old_limit + p_amount WHERE id = v_key_id;
  v_new_balance := (v_old_limit + p_amount) - v_used::INT;

  -- 记录交易
  INSERT INTO credit_transactions (id, user_id, key_id, type, amount, balance_after, description)
  VALUES (
    'txn_' || substr(md5(random()::text), 1, 16),
    v_user_id,
    v_key_id,
    'recharge',
    -p_amount,  -- 负数表示充值
    v_new_balance,
    p_description
  );

  RETURN QUERY SELECT '成功'::TEXT, p_user_name, p_amount, v_new_balance;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION recharge_by_name IS '按用户名充值: SELECT * FROM recharge_by_name(''张三'', 1000)';

-- 5. 按用户名查询余额
CREATE OR REPLACE FUNCTION get_balance_by_name(p_user_name TEXT)
RETURNS TABLE (
  "用户名" TEXT,
  "总积分" INT,
  "已使用" INT,
  "剩余" INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.name,
    COALESCE(k.quota_limit, 0)::INT,
    COALESCE(k.quota_used, 0)::INT,
    (COALESCE(k.quota_limit, 0) - COALESCE(k.quota_used, 0))::INT
  FROM users u
  LEFT JOIN api_keys k ON u.id = k.user_id
  WHERE u.name ILIKE '%' || p_user_name || '%';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_balance_by_name IS '按用户名查余额: SELECT * FROM get_balance_by_name(''张三'')';

-- 6. 设置用户积分（直接设置总额）
CREATE OR REPLACE FUNCTION set_credits_by_name(
  p_user_name TEXT,
  p_total_credits INT,
  p_description TEXT DEFAULT '管理员设置'
)
RETURNS TABLE (
  "结果" TEXT,
  "用户名" TEXT,
  "原总积分" INT,
  "新总积分" INT,
  "剩余积分" INT
) AS $$
DECLARE
  v_user_id TEXT;
  v_key_id TEXT;
  v_old_limit INT;
  v_used REAL;
  v_new_balance INT;
  v_diff INT;
BEGIN
  SELECT u.id, k.id, COALESCE(k.quota_limit, 0), COALESCE(k.quota_used, 0)
  INTO v_user_id, v_key_id, v_old_limit, v_used
  FROM users u
  LEFT JOIN api_keys k ON u.id = k.user_id
  WHERE u.name = p_user_name
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT '失败: 用户不存在'::TEXT, p_user_name, 0, 0, 0;
    RETURN;
  END IF;

  IF v_key_id IS NULL THEN
    RETURN QUERY SELECT '失败: 用户无API Key'::TEXT, p_user_name, 0, 0, 0;
    RETURN;
  END IF;

  UPDATE api_keys SET quota_limit = p_total_credits WHERE id = v_key_id;
  v_new_balance := p_total_credits - v_used::INT;
  v_diff := p_total_credits - v_old_limit;

  -- 记录交易
  INSERT INTO credit_transactions (id, user_id, key_id, type, amount, balance_after, description)
  VALUES (
    'txn_' || substr(md5(random()::text), 1, 16),
    v_user_id,
    v_key_id,
    CASE WHEN v_diff >= 0 THEN 'recharge' ELSE 'consumption' END,
    -v_diff,
    v_new_balance,
    p_description
  );

  RETURN QUERY SELECT '成功'::TEXT, p_user_name, v_old_limit, p_total_credits, v_new_balance;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION set_credits_by_name IS '设置用户总积分: SELECT * FROM set_credits_by_name(''张三'', 5000)';

-- 7. 查看用户最近交易
CREATE OR REPLACE FUNCTION get_transactions_by_name(
  p_user_name TEXT,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  "时间" TIMESTAMPTZ,
  "类型" TEXT,
  "变动" TEXT,
  "余额" INT,
  "描述" TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ct.created_at,
    CASE ct.type
      WHEN 'consumption' THEN '消费'
      WHEN 'recharge' THEN '充值'
      WHEN 'refund' THEN '退款'
      WHEN 'reward' THEN '奖励'
    END,
    CASE
      WHEN ct.amount > 0 THEN '-' || ct.amount
      ELSE '+' || ABS(ct.amount)
    END,
    ct.balance_after,
    ct.description
  FROM credit_transactions ct
  JOIN users u ON ct.user_id = u.id
  WHERE u.name ILIKE '%' || p_user_name || '%'
  ORDER BY ct.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_transactions_by_name IS '查看用户交易记录: SELECT * FROM get_transactions_by_name(''张三'')';

-- ============================================
-- 字段注释（在 Supabase 表视图中显示）
-- ============================================

-- users 表
COMMENT ON COLUMN users.id IS '用户唯一ID（系统生成）';
COMMENT ON COLUMN users.provider IS '注册来源: authing/tencent/manual';
COMMENT ON COLUMN users.provider_id IS '第三方平台的用户ID';
COMMENT ON COLUMN users.name IS '用户显示名称';
COMMENT ON COLUMN users.role IS '角色: admin/user';
COMMENT ON COLUMN users.status IS '状态: active/suspended';

-- api_keys 表
COMMENT ON COLUMN api_keys.id IS 'Key唯一ID（系统生成）';
COMMENT ON COLUMN api_keys.user_id IS '所属用户ID';
COMMENT ON COLUMN api_keys.key_prefix IS 'Key前缀（如ua_abc123）用于识别';
COMMENT ON COLUMN api_keys.quota_limit IS '★ 总积分（充值增加此值）';
COMMENT ON COLUMN api_keys.quota_used IS '★ 已消耗积分';
COMMENT ON COLUMN api_keys.status IS '状态: active/revoked';
COMMENT ON COLUMN api_keys.allowed_providers IS '允许的厂商JSON，null表示全部';

-- credit_transactions 表
COMMENT ON COLUMN credit_transactions.type IS '类型: consumption消费/recharge充值/refund退款/reward奖励';
COMMENT ON COLUMN credit_transactions.amount IS '变动量: 正数=消耗, 负数=充值';
COMMENT ON COLUMN credit_transactions.balance_after IS '变动后的剩余积分';
COMMENT ON COLUMN credit_transactions.service IS '服务类型: video/image/audio/chat';
