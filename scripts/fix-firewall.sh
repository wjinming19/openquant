#!/bin/bash
# OpenQuant 防火墙配置脚本

echo "🔥 OpenQuant 防火墙配置"
echo "========================"
echo ""

# 检查当前iptables规则
echo "📋 当前iptables规则:" && \
iptables -L -n | grep -E "8089|8090|8091" || echo "无相关规则"

echo ""
echo "🔧 添加防火墙规则放行端口..."

# 放行8089 (API)
iptables -I INPUT -p tcp --dport 8089 -j ACCEPT 2>/dev/null && echo "✅ 已放行 8089 (API)"

# 放行8090 (前端)
iptables -I INPUT -p tcp --dport 8090 -j ACCEPT 2>/dev/null && echo "✅ 已放行 8090 (前端)"

# 放行8091 (欢迎页)
iptables -I INPUT -p tcp --dport 8091 -j ACCEPT 2>/dev/null && echo "✅ 已放行 8091 (欢迎页)"

echo ""
echo "📋 更新后的iptables规则:" && \
iptables -L -n | grep -E "8089|8090|8091"

echo ""
echo "💾 保存规则..."
# 尝试保存（不同系统方式不同）
if command -v iptables-save &> /dev/null; then
    iptables-save > /etc/iptables/rules.v4 2>/dev/null || \
    iptables-save > /etc/sysconfig/iptables 2>/dev/null || \
    echo "⚠️ 请手动保存iptables规则"
fi

echo ""
echo "🎯 防火墙配置完成！"
echo ""
echo "如果仍无法访问，请检查:"
echo "1. 云服务器安全组/网络ACL规则"
echo "2. 云服务提供商控制台防火墙设置"
echo ""
echo "需要放行的端口:"
echo "  - 8089 (OpenQuant API)"
echo "  - 8090 (OpenQuant 前端)"
echo "  - 8091 (OpenQuant 欢迎页)"
