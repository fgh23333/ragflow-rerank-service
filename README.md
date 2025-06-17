fork本项目后，在cloudflare Workers 上部署，使用自己的域名。
# 使用说明
1. 在 Cloudflare Workers 上创建一个新的 Worker。
2. 将本项目的代码复制到 Worker 的编辑器中，或直接连接到 GitHub 仓库进行部署。
3. 在 Worker 的设置中，在 `wrangler.jsonc` 配置环境变量 `API_KEY_SECRET`，将其值设置为你的密钥（随意设置）。
4. 配置 Worker 的路由，将其指向你想要使用的域名
5. 保存并部署 Worker。
6. endpoint 为 `https://{你的cloudflare-worker-域名}/v1/embeddings`，也可以根据需要修改为自定义域。
# 代码说明
- `wrangler.jsonc`：Cloudflare Workers 的配置文件，包含环境变量和路由设置。
- `index.js`：主代码文件，处理请求和生成响应。
- `package.json`：项目的依赖和脚本配置文件。
- `README.md`：项目的说明文件。

# 注意事项
目前为允许所有域名访问，如果需要限制访问域名，可以在 `index.js` 中添加相应的逻辑。