# OpenQuant 行业分析数据接口设计

## 东方财富行业数据API

### 1. 行业板块列表
```
https://push2.eastmoney.com/api/qt/clist/get?
pn=1&pz=100&po=1&np=1&fltt=2&invt=2&fid=f12&fs=m:90+t:2
&fields=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f15,f16,f17,f18,f20,f21,f22,f23,f24,f25,f26,f33,f34,f35,f36,f37,f38,f39,f40,f41,f42,f43,f44,f45,f46,f47,f48,f49,f50,f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63,f64,f65,f66,f67,f68,f69,f70,f71,f72,f73,f74,f75,f76,f77,f78,f79,f80,f81,f82,f83,f84,f85,f86,f87,f88,f89,f90,f91,f92,f93
```

### 2. 概念板块列表
```
https://push2.eastmoney.com/api/qt/clist/get?
pn=1&pz=100&po=1&np=1&fltt=2&invt=2&fid=f12&fs=m:90+t:3
&fields=f12,f14,f3,f20,f21
```

### 3. 行业资金流向
```
https://push2.eastmoney.com/api/qt/clist/get?
pn=1&pz=100&po=1&np=1&fltt=2&invt=2&fid=f62&fs=m:90+t:2
&fields=f12,f14,f62,f63,f64,f65,f66,f67,f68,f69,f70,f71,f72,f73,f74,f75,f76,f77,f78,f79,f80,f81,f82,f83,f84,f85,f86,f87,f88,f89,f90,f91,f92,f93
```

字段说明:
- f12: 代码
- f14: 名称  
- f3: 涨跌幅
- f20: 总市值
- f62: 主力净流入
- f63: 主力流入
- f64: 主力流出
- f66: 超大单流入
- f67: 超大单流出
- f69: 大单流入
- f70: 大单流出

### 4. 行业成分股
```
https://push2.eastmoney.com/api/qt/clist/get?
pn=1&pz=100&po=1&np=1&fltt=2&invt=2&fid=f12&fs=b:BK0428
&fields=f12,f14,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13,f14,f15,f16,f17,f18,f19,f20,f21,f22,f23,f24,f25,f26,f27,f28,f29,f30,f31,f32,f33,f34,f35,f36,f37,f38,f39,f40,f41,f42,f43,f44,f45,f46,f47,f48,f49,f50,f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63,f64,f65,f66,f67,f68,f69,f70,f71,f72,f73,f74,f75,f76,f77,f78,f79,f80,f81,f82,f83,f84,f85,f86,f87,f88,f89,f90,f91,f92,f93
```

## 需要实现的后端接口

### GET /api/market/industries
返回行业列表，包含:
- 行业名称
- 涨跌幅
- 主力净流入
- 龙头股
- 成分股数量

### GET /api/market/industries/{code}/stocks
返回行业成分股列表

### GET /api/market/concepts
返回概念板块列表

## 前端展示

1. 行业排行表格
2. 资金流向排行
3. 行业K线图 (使用指数数据)
4. 成分股列表
