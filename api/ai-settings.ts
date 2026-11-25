// Hosted instances use server-managed credentials. No public endpoint can overwrite them.
export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "GET")
    return res
      .status(200)
      .json({
        configured: Boolean(process.env.DEEPSEEK_API_KEY),
        model: process.env.DEEPSEEK_MODEL || "deepseek-flash",
        editable: false,
      });
  return res.status(403).json({ message: "此部署的密钥由服务端管理员配置。" });
}
