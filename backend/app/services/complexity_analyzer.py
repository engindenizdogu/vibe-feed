"""
Complexity Analyzer for App Generation

Multi-stage algorithm to estimate app generation complexity:
1. Token Counting - Estimate input/output tokens
2. Feature Detection - NLP-based feature extraction
3. Scoring - Calculate final complexity (0-100)
"""

import re
from typing import Dict, List


class ComplexityAnalyzer:
    """Analyzes prompt complexity for app generation."""

    def __init__(self):
        # Feature patterns with complexity weights
        self.FEATURE_PATTERNS = {
            # Authentication & User Management (40 points)
            "authentication": {
                "patterns": [r"\b(auth|login|signup|sign up|sign in|register|user account|password)\b"],
                "weight": 40,
            },
            # Database & Persistence (30 points)
            "database": {
                "patterns": [r"\b(database|store|save|persist|data|record|table|sql)\b"],
                "weight": 30,
            },
            # Real-time Features (50 points)
            "realtime": {
                "patterns": [r"\b(real-?time|live|websocket|socket|instant|sync|collaborative)\b"],
                "weight": 50,
            },
            # External APIs (25 points)
            "external_api": {
                "patterns": [r"\b(api|integrate|fetch from|connect to|third[- ]party|external)\b"],
                "weight": 25,
            },
            # Payment Processing (45 points)
            "payments": {
                "patterns": [r"\b(payment|checkout|subscribe|subscription|stripe|paypal|billing)\b"],
                "weight": 45,
            },
            # AI/ML Features (60 points)
            "ai_ml": {
                "patterns": [r"\b(ai|artificial intelligence|ml|machine learning|gpt|openai|neural|chatbot)\b"],
                "weight": 60,
            },
            # Complex UI (35 points)
            "complex_ui": {
                "patterns": [r"\b(dashboard|chart|graph|visualization|drag|drop|animation|modal|carousel)\b"],
                "weight": 35,
            },
            # File Upload (30 points)
            "file_upload": {
                "patterns": [r"\b(upload|file|image|photo|attachment|document)\b"],
                "weight": 30,
            },
            # Search Functionality (25 points)
            "search": {
                "patterns": [r"\b(search|find|filter|query|lookup)\b"],
                "weight": 25,
            },
        }

    def analyze(self, prompt: str) -> Dict:
        """
        Analyze prompt complexity.

        Args:
            prompt: User's app description

        Returns:
            Dictionary with complexity analysis
        """
        text = prompt.lower()

        # 1. Length-based score (0-15 points)
        length_score = min((len(prompt) / 1000) * 15, 15)

        # 2. Detect features and calculate score
        detected_features = []
        feature_score = 0

        for feature_name, feature_data in self.FEATURE_PATTERNS.items():
            for pattern in feature_data["patterns"]:
                if re.search(pattern, text, re.IGNORECASE):
                    detected_features.append(feature_name)
                    feature_score += feature_data["weight"]
                    break  # Only count each feature once

        # 3. Sentence complexity (0-10 points)
        sentences = [s.strip() for s in re.split(r'[.!?]+', prompt) if len(s.strip()) > 10]
        sentence_score = min(len(sentences) * 2, 10)

        # 4. Word count bonus (0-10 points)
        words = len(prompt.split())
        word_score = min((words / 100) * 10, 10)

        # 5. Calculate base score
        base_score = length_score + sentence_score + word_score

        # 6. Apply feature multipliers
        if len(detected_features) >= 4:
            # Complex multi-feature app
            multiplier = 1.5
        elif len(detected_features) >= 2:
            # Medium complexity
            multiplier = 1.2
        else:
            # Simple app
            multiplier = 1.0

        # 7. Final score calculation
        total_score = (base_score + feature_score) * multiplier

        # Normalize to 0-100 range
        final_score = min(round(total_score / 2), 100)

        # Ensure minimum score
        if len(prompt.strip()) > 0:
            final_score = max(final_score, 10)

        # Determine complexity label
        if final_score < 20:
            label = "Simple"
            color = "#10B981"  # Green
        elif final_score < 45:
            label = "Moderate"
            color = "#F59E0B"  # Orange
        elif final_score < 70:
            label = "Complex"
            color = "#EF4444"  # Red
        else:
            label = "Very Complex"
            color = "#DC2626"  # Dark red

        return {
            "complexity_score": final_score,
            "complexity_label": label,
            "complexity_color": color,
            "detected_features": detected_features,
            "feature_count": len(detected_features),
        }


# Singleton instance
_analyzer = ComplexityAnalyzer()


def analyze_complexity(prompt: str) -> Dict:
    """
    Analyze prompt complexity (convenience function).

    Args:
        prompt: User's app description

    Returns:
        Dictionary with complexity analysis
    """
    return _analyzer.analyze(prompt)
