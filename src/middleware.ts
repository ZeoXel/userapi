import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 允许的源
const allowedOrigins = [
    // 本地开发
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    // 生产环境
    'https://canvas.zeoxel.cn',
    'https://api.zeoxel.cn',
    'https://zeoxel.cn',
];

export function middleware(request: NextRequest) {
    const origin = request.headers.get('origin') || '';
    const isAllowedOrigin = allowedOrigins.includes(origin) || origin === '';

    // 处理预检请求 (OPTIONS)
    if (request.method === 'OPTIONS') {
        return new NextResponse(null, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': isAllowedOrigin ? origin : allowedOrigins[0],
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
                'Access-Control-Max-Age': '86400',
            },
        });
    }

    // 获取响应并添加 CORS 头
    const response = NextResponse.next();

    if (isAllowedOrigin && origin) {
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    }

    return response;
}

// 配置 middleware 匹配的路径
export const config = {
    matcher: '/api/:path*',
};
