/**
 * Cloudflare Worker to "emulate" an OpenAI API endpoint for reranking.
 * FINAL VERSION: Includes Health Checks, CORS, and crucial Logging.
 */

// 定义 CORS 头部，解决跨域问题
const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

export default {
	async fetch(request, env, ctx) {
		// ---- 日志1：打印请求头信息，方便排查认证问题 ----
		console.log(`Incoming request from: ${request.headers.get('cf-connecting-ip')}`);
		console.log(`Request Method: ${request.method}, URL: ${request.url}`);

		// 处理浏览器的 OPTIONS 预检请求
		if (request.method === 'OPTIONS') {
			return new Response(null, { status: 204, headers: corsHeaders });
		}

		// 检查请求路径
		const url = new URL(request.url);
		if (url.pathname !== '/v1/embeddings') {
			return new Response('Not Found', { status: 404, headers: { ...corsHeaders } });
		}

		// 检查认证
		const authHeader = request.headers.get('Authorization');
		const expectedAuth = `Bearer ${env.API_KEY_SECRET}`;
		if (!authHeader || authHeader !== expectedAuth) {
			// ---- 日志2：认证失败时打印 ----
			console.log("Authentication failed. Header received:", authHeader);
			return new Response('{"error": "Invalid API Key"}', {
				status: 401,
				headers: { 'Content-Type': 'application/json', ...corsHeaders },
			});
		}

		const requestBody = await request.json();

		// --- 核心修正：使用从日志中发现的真实键名 ---
		const query = requestBody.query;     // 旧代码是 requestBody.user
		const documents = requestBody.documents; // 旧代码是 requestBody.input
		// --- 修正结束 ---

		const modelName = requestBody.model;

		if (!query || !documents || !Array.isArray(documents)) {
			// 这个逻辑现在只会在真正的健康检查时触发
			return new Response(JSON.stringify({
				object: 'list',
				data: [],
				model: modelName || 'health-check-ok',
				usage: { prompt_tokens: 0, total_tokens: 0 },
			}), {
				status: 200,
				headers: { 'Content-Type': 'application/json', ...corsHeaders },
			});
		}

		// ---- 日志3：当作为真实请求处理时打印 ----
		console.log(`Processing rerank for query: "${query}" with ${documents.length} documents.`);
		// console.log(documents)

		// 将文档转换为 Cloudflare AI 模型所需的格式
		const contexts = documents.map(docText => ({ text: docText }));

		// 调用 Cloudflare AI 模型
		const cfModel = '@cf/baai/bge-reranker-base';
		const inputs = { query, contexts };

		const scores = await env.AI.run(cfModel, inputs);

		console.log(scores);

		// 封装并返回成功响应
		const responseData = {
			id: crypto.randomUUID(), // Generate a unique ID for the response
			results: scores.response.map(result => ({
				index: result.id,                         // Map 'id' to 'index'
				relevance_score: result.score,            // Map 'score' to 'relevance_score'
				document: documents[result.id],           // Get the original document text using the index
			})),
		};

		return new Response(JSON.stringify(responseData), {
			headers: { 'Content-Type': 'application/json', ...corsHeaders },
		});
	},
};