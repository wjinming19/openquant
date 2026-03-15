"""
OpenQuant - 技术指标计算模块
"""

import numpy as np
from typing import List, Dict, Optional
from dataclasses import dataclass

@dataclass
class TechnicalIndicators:
    """技术指标结果"""
    symbol: str
    price: float
    change_pct: float
    ma5: float
    ma10: float
    ma20: float
    ma60: float
    rsi: float
    macd_dif: float
    macd_dea: float
    macd_hist: float
    bb_upper: float
    bb_middle: float
    bb_lower: float
    bb_position: float
    volume_ratio: float
    score: float
    rating: str
    stars: str
    signals: List[str]

class TechnicalAnalyzer:
    """技术分析器"""
    
    @staticmethod
    def calculate_ma(prices: List[float], period: int) -> float:
        """计算移动平均线"""
        if len(prices) < period:
            return prices[-1] if prices else 0
        return sum(prices[-period:]) / period
    
    @staticmethod
    def calculate_ema(prices: List[float], period: int) -> List[float]:
        """计算指数移动平均线"""
        if len(prices) < period:
            return prices
        
        ema = []
        multiplier = 2 / (period + 1)
        sma = sum(prices[:period]) / period
        ema.append(sma)
        
        for price in prices[period:]:
            ema.append((price - ema[-1]) * multiplier + ema[-1])
        return ema
    
    @staticmethod
    def calculate_rsi(prices: List[float], period: int = 14) -> float:
        """计算RSI"""
        if len(prices) < period + 1:
            return 50
        
        deltas = [prices[i] - prices[i-1] for i in range(1, len(prices))]
        gains = [d if d > 0 else 0 for d in deltas[-period:]]
        losses = [-d if d < 0 else 0 for d in deltas[-period:]]
        
        avg_gain = sum(gains) / period
        avg_loss = sum(losses) / period
        
        if avg_loss == 0:
            return 100
        
        rs = avg_gain / avg_loss
        return 100 - (100 / (1 + rs))
    
    @staticmethod
    def calculate_macd(prices: List[float]) -> Dict[str, float]:
        """计算MACD"""
        if len(prices) < 26:
            return {'dif': 0, 'dea': 0, 'hist': 0}
        
        ema12 = TechnicalAnalyzer.calculate_ema(prices, 12)
        ema26 = TechnicalAnalyzer.calculate_ema(prices, 26)
        
        # 对齐长度
        diff = len(ema12) - len(ema26)
        if diff > 0:
            ema12 = ema12[diff:]
        
        dif = [ema12[i] - ema26[i] for i in range(len(ema26))]
        dea = TechnicalAnalyzer.calculate_ema(dif, 9)
        
        diff2 = len(dif) - len(dea)
        if diff2 > 0:
            dif = dif[diff2:]
        
        macd = [(dif[i] - dea[i]) * 2 for i in range(len(dea))]
        
        return {
            'dif': dif[-1] if dif else 0,
            'dea': dea[-1] if dea else 0,
            'hist': macd[-1] if macd else 0
        }
    
    @staticmethod
    def calculate_bollinger(prices: List[float], period: int = 20) -> Dict[str, float]:
        """计算布林带"""
        if len(prices) < period:
            return {'upper': prices[-1], 'middle': prices[-1], 'lower': prices[-1]}
        
        recent_prices = prices[-period:]
        middle = sum(recent_prices) / period
        variance = sum([(p - middle) ** 2 for p in recent_prices]) / period
        std = variance ** 0.5
        
        return {
            'upper': middle + 2 * std,
            'middle': middle,
            'lower': middle - 2 * std
        }
    
    @staticmethod
    def analyze_stock(data: List[Dict]) -> Optional[TechnicalIndicators]:
        """分析股票数据"""
        if not data or len(data) < 30:
            return None
        
        closes = [d['close'] for d in data]
        volumes = [d.get('volume', 0) for d in data]
        
        current_price = closes[-1]
        prev_price = closes[-2] if len(closes) > 1 else current_price
        change_pct = (current_price - prev_price) / prev_price * 100
        
        # 计算指标
        ma5 = TechnicalAnalyzer.calculate_ma(closes, 5)
        ma10 = TechnicalAnalyzer.calculate_ma(closes, 10)
        ma20 = TechnicalAnalyzer.calculate_ma(closes, 20)
        ma60 = TechnicalAnalyzer.calculate_ma(closes, 60)
        
        rsi = TechnicalAnalyzer.calculate_rsi(closes)
        macd = TechnicalAnalyzer.calculate_macd(closes)
        bb = TechnicalAnalyzer.calculate_bollinger(closes)
        
        # 布林带位置
        bb_position = (current_price - bb['lower']) / (bb['upper'] - bb['lower']) if bb['upper'] != bb['lower'] else 0.5
        
        # 成交量比
        if len(volumes) >= 20:
            recent_vol = sum(volumes[-5:]) / 5
            avg_vol = sum(volumes[-20:]) / 20
            volume_ratio = recent_vol / avg_vol if avg_vol > 0 else 1
        else:
            volume_ratio = 1
        
        # 评分系统
        score = 0
        signals = []
        
        # MACD评分
        if macd['dif'] > macd['dea']:
            score += 1
            signals.append("MACD金叉")
            if macd['hist'] > 0:
                score += 0.5
        elif macd['dif'] < macd['dea']:
            score -= 1
            signals.append("MACD死叉")
        
        # RSI评分
        if rsi < 30:
            score += 2
            signals.append("RSI超卖")
        elif rsi > 70:
            score -= 2
            signals.append("RSI超买")
        elif rsi > 50:
            score += 0.3
        else:
            score -= 0.3
        
        # 均线评分
        if ma5 > ma10 > ma20:
            score += 1.5
            signals.append("多头排列")
        elif ma5 < ma10 < ma20:
            score -= 1.5
            signals.append("空头排列")
        
        # 布林带评分
        if bb_position < 0.2:
            score += 1
            signals.append("触及下轨")
        elif bb_position > 0.8:
            score -= 1
            signals.append("触及上轨")
        
        # 评级
        if score >= 3:
            rating = "强烈看多"
            stars = "⭐⭐⭐⭐⭐"
        elif score >= 1.5:
            rating = "看多"
            stars = "⭐⭐⭐⭐"
        elif score >= 0:
            rating = "中性偏多"
            stars = "⭐⭐⭐"
        elif score >= -1.5:
            rating = "中性偏空"
            stars = "⭐⭐"
        else:
            rating = "看空"
            stars = "⭐"
        
        return TechnicalIndicators(
            symbol=data[-1].get('symbol', ''),
            price=round(current_price, 2),
            change_pct=round(change_pct, 2),
            ma5=round(ma5, 2),
            ma10=round(ma10, 2),
            ma20=round(ma20, 2),
            ma60=round(ma60, 2),
            rsi=round(rsi, 1),
            macd_dif=round(macd['dif'], 3),
            macd_dea=round(macd['dea'], 3),
            macd_hist=round(macd['hist'], 3),
            bb_upper=round(bb['upper'], 2),
            bb_middle=round(bb['middle'], 2),
            bb_lower=round(bb['lower'], 2),
            bb_position=round(bb_position, 2),
            volume_ratio=round(volume_ratio, 2),
            score=round(score, 1),
            rating=rating,
            stars=stars,
            signals=signals
        )
