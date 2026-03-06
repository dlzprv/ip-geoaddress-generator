# Cloudflare Email Worker 部署指南

## 前置要求

- Cloudflare 账号
- 已托管在 Cloudflare 的域名
- Node.js 安装

## 部署步骤

### 1. 创建 KV 命名空间

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 **Workers & Pages** → **KV**
3. 点击 **Create a namespace**
4. 命名为 `email-storage`
5. 复制生成的 **Namespace ID**

### 2. 配置 wrangler.toml

编辑 `wrangler.toml` 文件：

```toml
name = "email-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[kv_namespaces]]
binding = "DB"
id = "your-kv-namespace-id"  # 替换为您的 KV Namespace ID

[[routes]]
pattern = "email.yourdomain.com/*"  # 替换为您的域名
zone_name = "yourdomain.com"  # 替换为您的域名

[vars]
ENVIRONMENT = "production"
```

### 3. 安装依赖

```bash
cd cloudflare-worker
npm init -y
npm install -D wrangler typescript @cloudflare/workers-types
```

### 4. 登录 Cloudflare

```bash
npx wrangler login
```

### 5. 部署 Worker

```bash
npx wrangler deploy
```

### 6. 配置 Email Routing

1. 在 Cloudflare Dashboard 中选择您的域名
2. 进入 **Email** → **Email Routing**
3. 点击 **Enable Email Routing**
4. 在 **Routing rules** 中：
   - 选择 **Send to a Worker**
   - 选择刚才部署的 `email-worker`
   - 设置 **Catch-all address** 为这个 Worker

### 7. 配置 DNS

添加以下 DNS 记录：

```
类型: A
名称: email
内容: 192.0.2.1 (Cloudflare Worker 的占位 IP)
代理状态: 已代理

类型: TXT
名称: @
内容: v=spf1 include:_spf.mx.cloudflare.net ~all
```

### 8. 测试 Worker

访问以下 URL 测试 API：

```bash
# 创建邮箱地址
curl -X POST https://email.yourdomain.com/api/create-address \
  -H "Content-Type: application/json" \
  -d '{"address":"test@yourdomain.com"}'

# 获取邮件列表
curl "https://email.yourdomain.com/api/emails?address=test@yourdomain.com"
```

## API 端点

### POST /api/create-address
创建新的邮箱地址

**请求体：**
```json
{
  "address": "user@yourdomain.com"
}
```

### GET /api/emails
获取指定邮箱的所有邮件

**查询参数：**
- `address`: 邮箱地址

### DELETE /api/delete-email
删除指定邮件

**请求体：**
```json
{
  "address": "user@yourdomain.com",
  "emailId": "email-uuid"
}
```

### DELETE /api/delete-address
删除整个邮箱地址及其所有邮件

**请求体：**
```json
{
  "address": "user@yourdomain.com"
}
```

## 注意事项

1. **KV 存储限制**：免费套餐有 100,000 次读取/天和 1,000 次写入/天的限制
2. **邮件大小限制**：Worker 有 128MB 内存限制
3. **域名验证**：确保您的域名已在 Cloudflare 上正确配置
4. **SPF 记录**：正确配置 SPF 记录以避免邮件被标记为垃圾邮件

## 故障排查

### Worker 无法接收邮件
- 检查 Email Routing 是否正确配置
- 确认 Worker 是否正确绑定到 Email Routing
- 查看 Worker 日志：`npx wrangler tail`

### API 请求失败
- 检查路由配置是否正确
- 确认 KV 命名空间 ID 是否正确
- 查看 Worker 日志获取详细错误信息

### 邮件无法发送到 Worker
- 确认 MX 记录已正确配置
- 检查 Email Routing 的 Catch-all 设置
- 等待 DNS 传播（可能需要几分钟到几小时）

## 下一步

部署成功后，您需要修改前端代码来连接这个 Worker API。请参考 `useCloudflareMail.ts` 文件。
