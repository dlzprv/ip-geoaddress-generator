# 使用 Cloudflare 自定义邮件服务配置指南

## 概述

本指南将帮助您从 Mail.tm 切换到使用 Cloudflare 的自定义邮件服务，让您可以使用自己的域名创建临时邮箱。

## 架构说明

```
用户 → Cloudflare Pages (前端) → Cloudflare Worker (API)
                                    ↓
                                KV Storage (存储邮件)
                                    ↑
                            Cloudflare Email Routing (接收邮件)
                                    ↑
                                发件人
```

## 部署步骤

### 第一步：部署 Cloudflare Worker

1. **创建 KV 命名空间**
   - 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
   - 进入 **Workers & Pages** → **KV**
   - 点击 **Create a namespace**
   - 命名为 `email-storage`
   - 复制生成的 **Namespace ID**

2. **配置 Worker**
   ```bash
   cd cloudflare-worker
   npm init -y
   npm install -D wrangler typescript @cloudflare/workers-types
   ```

3. **编辑 wrangler.toml**
   ```toml
   name = "email-worker"
   main = "src/index.ts"
   compatibility_date = "2024-01-01"

   [[kv_namespaces]]
   binding = "DB"
   id = "your-kv-namespace-id"  # 替换为您的 KV ID

   [[routes]]
   pattern = "email.yourdomain.com/*"  # 替换为您的域名
   zone_name = "yourdomain.com"  # 替换为您的域名
   ```

4. **部署**
   ```bash
   npx wrangler login
   npx wrangler deploy
   ```

### 第二步：配置 Email Routing

1. 在 Cloudflare Dashboard 中选择您的域名
2. 进入 **Email** → **Email Routing**
3. 点击 **Enable Email Routing**
4. 在 **Routing rules** 中：
   - 选择 **Send to a Worker**
   - 选择 `email-worker`
   - 设置为 **Catch-all address**

### 第三步：配置 DNS

添加以下 DNS 记录：

```
类型: A
名称: email
内容: 192.0.2.1
代理状态: 已代理

类型: TXT
名称: @
内容: v=spf1 include:_spf.mx.cloudflare.net ~all
```

### 第四步：配置前端

1. **创建环境变量文件**
   ```bash
   cp .env.example .env.local
   ```

2. **编辑 .env.local**
   ```
   NEXT_PUBLIC_CLOUDFLARE_WORKER_URL=https://email.yourdomain.com
   ```

3. **修改 hooks/useMail.ts**
   
   将第 1 行的导入改为：
   ```typescript
   // import Mailjs from "@cemalgnlts/mailjs";
   ```

   在文件开头添加：
   ```typescript
   import useCloudflareMail from "./useCloudflareMail";
   ```

   然后将整个 `useMail` 函数替换为：
   ```typescript
   export default function useMail(): UseMailReturn {
     return useCloudflareMail();
   }
   ```

4. **更新域名列表**
   
   编辑 `hooks/useCloudflareMail.ts` 第 39-41 行：
   ```typescript
   const customDomains = [
     { id: "custom-1", domain: "yourdomain.com" },  // 替换为您的域名
   ];
   ```

### 第五步：部署前端

```bash
npm run build
```

提交并推送到 GitHub，Cloudflare Pages 会自动部署。

## 功能对比

| 功能 | Mail.tm | Cloudflare |
|------|---------|------------|
| 自定义域名 | ❌ | ✅ |
| 实时接收 | ✅ | ✅ (轮询) |
| 免费额度 | 有限制 | 100K 读/天 |
| 服务器需求 | 无 | 无 |
| 部署难度 | 简单 | 中等 |

## 注意事项

1. **轮询间隔**：当前设置为 5 秒轮询一次，可根据需要调整
2. **KV 限制**：免费套餐有存储和请求限制
3. **邮件大小**：Worker 有内存限制，超大邮件可能无法处理
4. **SPF 记录**：正确配置以避免邮件被标记为垃圾邮件

## 测试

### 测试 Worker API

```bash
# 创建邮箱
curl -X POST https://email.yourdomain.com/api/create-address \
  -H "Content-Type: application/json" \
  -d '{"address":"test@yourdomain.com"}'

# 发送测试邮件到 test@yourdomain.com

# 获取邮件
curl "https://email.yourdomain.com/api/emails?address=test@yourdomain.com"
```

### 测试前端

1. 访问您的 Cloudflare Pages 网站
2. 在自定义邮箱表单中输入用户名
3. 选择您的域名
4. 点击"创建自定义邮箱"
5. 发送测试邮件到创建的邮箱地址
6. 等待 5 秒后，邮件应该会出现在收信箱中

## 故障排查

### Worker 部署失败
- 检查 wrangler.toml 配置
- 确认已登录 Cloudflare：`npx wrangler login`
- 查看错误日志

### 无法接收邮件
- 检查 Email Routing 配置
- 确认 Worker 已正确绑定
- 查看 Worker 日志：`npx wrangler tail`

### 前端无法连接 Worker
- 检查环境变量配置
- 确认 Worker URL 正确
- 检查 CORS 配置

## 成本估算

Cloudflare 免费套餐包括：
- Workers：100,000 请求/天
- KV：100,000 读/天，1,000 写/天
- Email Routing：无限制

对于临时邮箱应用，免费套餐通常足够使用。

## 下一步

- 添加邮件删除功能
- 实现邮件搜索
- 添加邮件导出功能
- 配置自定义域名邮箱转发
