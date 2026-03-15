import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const { Title, Text } = Typography;

// 硬编码的登录凭证
const VALID_USERNAME = 'kimwang';
const VALID_PASSWORD = 'cxtz@2026';

interface LoginProps {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
}

const Login: React.FC<LoginProps> = ({ darkMode }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // 检查是否已登录
  useEffect(() => {
    const isLoggedIn = localStorage.getItem('openquant_auth');
    if (isLoggedIn === 'true') {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleLogin = (values: { username: string; password: string }) => {
    setLoading(true);
    
    // 模拟登录验证
    setTimeout(() => {
      if (values.username === VALID_USERNAME && values.password === VALID_PASSWORD) {
        localStorage.setItem('openquant_auth', 'true');
        localStorage.setItem('openquant_user', values.username);
        message.success('登录成功！');
        navigate('/dashboard');
      } else {
        message.error('用户名或密码错误！');
      }
      setLoading(false);
    }, 500);
  };

  return (
    <div className={`login-container ${darkMode ? 'dark' : 'light'}`}>
      <Card className="login-card">
        <div className="login-header">
          <Title level={3} className="login-title">
            📊 OpenQuant
          </Title>
          <Text type="secondary">量化投资分析平台</Text>
        </div>

        <Form
          name="login"
          onFinish={handleLogin}
          autoComplete="off"
          layout="vertical"
          size="large"
        >
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>

          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password placeholder="请输入密码" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
            >
              登录
            </Button>
          </Form.Item>
        </Form>

        <div className="login-footer">
          <Text type="secondary" style={{ fontSize: 12 }}>
            © 2026 OpenQuant. All rights reserved.
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default Login;
