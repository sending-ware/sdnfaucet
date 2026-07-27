# SDN Faucet — 一键部署脚本
# 用法：在项目目录下 PowerShell 中运行此脚本
# .\deploy.ps1

Write-Host "🚀 SDN Faucet 部署开始..." -ForegroundColor Cyan
Write-Host ""

# 步骤1：推送代码到 GitHub
Write-Host "[1/2] 推送代码到 GitHub..." -ForegroundColor Yellow
git push -u origin main

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Git 推送失败，请检查网络连接和 GitHub 登录状态。" -ForegroundColor Red
    Write-Host "   手动执行：git push -u origin main" -ForegroundColor Gray
    exit 1
}

Write-Host "✅ 代码已推送到 GitHub！" -ForegroundColor Green
Write-Host ""

# 步骤2：引导 Cloudflare Pages 部署
Write-Host "[2/2] Cloudflare Pages 部署（浏览器操作）" -ForegroundColor Yellow
Write-Host ""
Write-Host "请在浏览器中打开以下地址：" -ForegroundColor White
Write-Host "  👉 https://dash.cloudflare.com/pages" -ForegroundColor Cyan
Write-Host ""
Write-Host "操作步骤：" -ForegroundColor White
Write-Host "  1. 点击「Connect to Git」→ 选择 GitHub" -ForegroundColor Gray
Write-Host "  2. 选择仓库「sending-ware/sdnfaucet」" -ForegroundColor Gray
Write-Host "  3. 构建设置：" -ForegroundColor Gray
Write-Host "     Framework: Astro" -ForegroundColor Gray
Write-Host "     Build command: npm run build" -ForegroundColor Gray
Write-Host "     Output directory: dist" -ForegroundColor Gray
Write-Host "  4. 点击「Save and Deploy」" -ForegroundColor Gray
Write-Host ""

# 自动打开 Cloudflare Pages
Start-Process "https://dash.cloudflare.com/pages"

# DNS 提示
Write-Host ""
Write-Host "============================================" -ForegroundColor DarkGray
Write-Host "📋 部署完成后，DNS 配置提醒：" -ForegroundColor Yellow
Write-Host "  阿里云 DNS → CNAME www → sdnfaucet.pages.dev" -ForegroundColor White
Write-Host "  替换旧的 faucet-pro-v3.site.accio.ai" -ForegroundColor Gray
Write-Host "============================================" -ForegroundColor DarkGray
Write-Host ""
Write-Host "✅ 部署脚本完成！" -ForegroundColor Green
