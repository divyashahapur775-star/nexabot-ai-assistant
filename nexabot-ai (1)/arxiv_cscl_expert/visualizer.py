"""
Concept Visualization Engine for arXiv cs.CL Domain Expert.
Generates programmatic, publication-quality SVG, Graphviz, and HTML diagrams
for core NLP and Computational Linguistics concepts (Transformer, Multi-Head Attention,
LoRA, Encoder-Decoder, RAG, etc.) instead of falling back to ASCII art or text.
"""

from typing import Optional


def generate_transformer_svg() -> str:
    """Generates a detailed SVG diagram of the Transformer Architecture."""
    return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 850 560" width="100%" height="100%" style="background:#0f172a; border-radius:12px; font-family:system-ui, -apple-system, sans-serif;">
  <defs>
    <linearGradient id="encGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0284c7"/>
      <stop offset="100%" stop-color="#0369a1"/>
    </linearGradient>
    <linearGradient id="decGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#7c3aed"/>
      <stop offset="100%" stop-color="#6d28d9"/>
    </linearGradient>
    <linearGradient id="attnGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ea580c"/>
      <stop offset="100%" stop-color="#c2410c"/>
    </linearGradient>
    <linearGradient id="ffnGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#059669"/>
      <stop offset="100%" stop-color="#047857"/>
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.4"/>
    </filter>
    <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#94a3b8"/>
    </marker>
    <marker id="arrow-cyan" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8"/>
    </marker>
  </defs>

  <!-- Title & Subtitle -->
  <text x="425" y="32" text-anchor="middle" fill="#f8fafc" font-size="20" font-weight="700" letter-spacing="0.5">Transformer Architecture (Vaswani et al., cs.CL / arXiv:1706.03762)</text>
  <text x="425" y="52" text-anchor="middle" fill="#94a3b8" font-size="12">Attention Is All You Need — Pure Attention-Driven Sequence-to-Sequence Modeling</text>

  <!-- ENCODER STACK (Left) -->
  <rect x="60" y="75" width="320" height="420" rx="14" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="4,4"/>
  <text x="75" y="100" fill="#38bdf8" font-size="14" font-weight="700">ENCODER (N = 6 Layers)</text>

  <!-- Encoder Blocks -->
  <rect x="90" y="115" width="260" height="46" rx="8" fill="url(#ffnGrad)" filter="url(#shadow)"/>
  <text x="220" y="142" text-anchor="middle" fill="#ffffff" font-size="13" font-weight="600">Feed-Forward Network (FFN)</text>

  <rect x="90" y="175" width="260" height="34" rx="8" fill="#334155"/>
  <text x="220" y="197" text-anchor="middle" fill="#e2e8f0" font-size="12">Add &amp; LayerNorm (Residual)</text>

  <rect x="90" y="225" width="260" height="46" rx="8" fill="url(#attnGrad)" filter="url(#shadow)"/>
  <text x="220" y="252" text-anchor="middle" fill="#ffffff" font-size="13" font-weight="600">Multi-Head Self-Attention</text>

  <rect x="90" y="285" width="260" height="34" rx="8" fill="#334155"/>
  <text x="220" y="307" text-anchor="middle" fill="#e2e8f0" font-size="12">Add &amp; LayerNorm (Residual)</text>

  <!-- Encoder Input & Positional Encoding -->
  <rect x="90" y="350" width="260" height="42" rx="8" fill="#475569"/>
  <text x="220" y="375" text-anchor="middle" fill="#f8fafc" font-size="12" font-weight="600">Positional Encoding + Input Embeddings</text>

  <rect x="130" y="420" width="180" height="34" rx="8" fill="#0f172a" stroke="#64748b"/>
  <text x="220" y="442" text-anchor="middle" fill="#cbd5e1" font-size="12">Inputs: "The animal didn't cross..."</text>

  <!-- Arrows in Encoder -->
  <line x1="220" y1="420" x2="220" y2="395" stroke="#94a3b8" stroke-width="2" marker-end="url(#arrow)"/>
  <line x1="220" y1="350" x2="220" y2="322" stroke="#94a3b8" stroke-width="2" marker-end="url(#arrow)"/>
  <line x1="220" y1="285" x2="220" y2="274" stroke="#94a3b8" stroke-width="2" marker-end="url(#arrow)"/>
  <line x1="220" y1="225" x2="220" y2="212" stroke="#94a3b8" stroke-width="2" marker-end="url(#arrow)"/>
  <line x1="220" y1="175" x2="220" y2="164" stroke="#94a3b8" stroke-width="2" marker-end="url(#arrow)"/>

  <!-- DECODER STACK (Right) -->
  <rect x="470" y="75" width="320" height="420" rx="14" fill="#1e293b" stroke="#a855f7" stroke-width="1.5" stroke-dasharray="4,4"/>
  <text x="485" y="100" fill="#c084fc" font-size="14" font-weight="700">DECODER (N = 6 Layers)</text>

  <!-- Decoder Blocks -->
  <rect x="500" y="115" width="260" height="42" rx="8" fill="url(#ffnGrad)" filter="url(#shadow)"/>
  <text x="630" y="141" text-anchor="middle" fill="#ffffff" font-size="13" font-weight="600">Feed-Forward Network (FFN)</text>

  <rect x="500" y="170" width="260" height="42" rx="8" fill="url(#decGrad)" filter="url(#shadow)"/>
  <text x="630" y="196" text-anchor="middle" fill="#ffffff" font-size="13" font-weight="600">Cross-Attention (Enc-Dec Attention)</text>

  <rect x="500" y="225" width="260" height="42" rx="8" fill="url(#attnGrad)" filter="url(#shadow)"/>
  <text x="630" y="251" text-anchor="middle" fill="#ffffff" font-size="13" font-weight="600">Masked Multi-Head Self-Attention</text>

  <rect x="500" y="280" width="260" height="32" rx="8" fill="#334155"/>
  <text x="630" y="301" text-anchor="middle" fill="#e2e8f0" font-size="12">Add &amp; LayerNorm (Residual)</text>

  <!-- Decoder Input & Positional Encoding -->
  <rect x="500" y="350" width="260" height="42" rx="8" fill="#475569"/>
  <text x="630" y="375" text-anchor="middle" fill="#f8fafc" font-size="12" font-weight="600">Positional Encoding + Output Embeddings</text>

  <rect x="540" y="420" width="180" height="34" rx="8" fill="#0f172a" stroke="#64748b"/>
  <text x="630" y="442" text-anchor="middle" fill="#cbd5e1" font-size="12">Outputs (Shifted Right)</text>

  <!-- Cross-Attention Key/Value Bridge (From Encoder Top to Decoder Cross-Attn) -->
  <path d="M 350 138 C 430 138, 430 191, 497 191" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-dasharray="6,4" marker-end="url(#arrow-cyan)"/>
  <text x="425" y="160" text-anchor="middle" fill="#38bdf8" font-size="11" font-weight="600">Key (K), Value (V)</text>

  <!-- Final Linear & Softmax Output Header -->
  <rect x="500" y="510" width="260" height="34" rx="8" fill="#22c55e" filter="url(#shadow)"/>
  <text x="630" y="532" text-anchor="middle" fill="#0f172a" font-size="13" font-weight="700">Linear + Softmax (Next-Token Probabilities)</text>
  <line x1="630" y1="115" x2="630" y2="70" stroke="#94a3b8" stroke-width="2" marker-end="url(#arrow)"/>
</svg>"""


def generate_self_attention_svg() -> str:
    """Generates an SVG diagram for Multi-Head and Scaled Dot-Product Self-Attention."""
    return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 850 480" width="100%" height="100%" style="background:#090d16; border-radius:12px; font-family:system-ui, -apple-system, sans-serif;">
  <defs>
    <linearGradient id="qkvGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>
    <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f97316"/>
      <stop offset="100%" stop-color="#ea580c"/>
    </linearGradient>
    <marker id="attnArrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8"/>
    </marker>
  </defs>

  <text x="425" y="32" text-anchor="middle" fill="#f8fafc" font-size="19" font-weight="700">Scaled Dot-Product Attention: Attention(Q, K, V) = softmax(QKᵀ / √dₖ) V</text>
  <text x="425" y="52" text-anchor="middle" fill="#94a3b8" font-size="12">Mathematical Data Flow &amp; Parallel Matrix Projections in Multi-Head Attention</text>

  <!-- Input Vector X -->
  <rect x="335" y="75" width="180" height="38" rx="8" fill="#1e293b" stroke="#64748b"/>
  <text x="425" y="99" text-anchor="middle" fill="#f1f5f9" font-size="13" font-weight="600">Input Sequence X ∈ ℝ^(N × d)</text>

  <!-- Q, K, V Projections -->
  <rect x="150" y="150" width="150" height="42" rx="8" fill="url(#qkvGrad)"/>
  <text x="225" y="176" text-anchor="middle" fill="#ffffff" font-size="13" font-weight="700">Queries (Q = X · W_Q)</text>

  <rect x="350" y="150" width="150" height="42" rx="8" fill="url(#qkvGrad)"/>
  <text x="425" y="176" text-anchor="middle" fill="#ffffff" font-size="13" font-weight="700">Keys (K = X · W_K)</text>

  <rect x="550" y="150" width="150" height="42" rx="8" fill="url(#qkvGrad)"/>
  <text x="625" y="176" text-anchor="middle" fill="#ffffff" font-size="13" font-weight="700">Values (V = X · W_V)</text>

  <line x1="390" y1="113" x2="235" y2="148" stroke="#38bdf8" stroke-width="2" marker-end="url(#attnArrow)"/>
  <line x1="425" y1="113" x2="425" y2="148" stroke="#38bdf8" stroke-width="2" marker-end="url(#attnArrow)"/>
  <line x1="460" y1="113" x2="615" y2="148" stroke="#38bdf8" stroke-width="2" marker-end="url(#attnArrow)"/>

  <!-- MatMul Q · K^T -->
  <rect x="230" y="225" width="220" height="40" rx="8" fill="url(#scoreGrad)"/>
  <text x="340" y="250" text-anchor="middle" fill="#ffffff" font-size="13" font-weight="700">MatMul: S = Q · Kᵀ</text>

  <line x1="225" y1="192" x2="310" y2="223" stroke="#f97316" stroke-width="2"/>
  <line x1="425" y1="192" x2="360" y2="223" stroke="#f97316" stroke-width="2"/>

  <!-- Scaling by sqrt(d_k) -->
  <rect x="230" y="285" width="220" height="36" rx="8" fill="#334155"/>
  <text x="340" y="308" text-anchor="middle" fill="#e2e8f0" font-size="12" font-weight="600">Scale: S / √d_k (prevents gradient vanishing)</text>
  <line x1="340" y1="265" x2="340" y2="283" stroke="#94a3b8" stroke-width="2"/>

  <!-- Softmax Weight Matrix -->
  <rect x="230" y="340" width="220" height="40" rx="8" fill="#8b5cf6"/>
  <text x="340" y="365" text-anchor="middle" fill="#ffffff" font-size="13" font-weight="700">Softmax: A = softmax(S / √d_k)</text>
  <line x1="340" y1="321" x2="340" y2="338" stroke="#94a3b8" stroke-width="2"/>

  <!-- Final MatMul with Values (V) -->
  <rect x="315" y="415" width="250" height="44" rx="8" fill="#10b981"/>
  <text x="440" y="442" text-anchor="middle" fill="#0f172a" font-size="14" font-weight="700">Context Vector: Output = A · V</text>

  <line x1="340" y1="380" x2="420" y2="413" stroke="#10b981" stroke-width="2"/>
  <line x1="625" y1="192" x2="470" y2="413" stroke="#10b981" stroke-width="2" stroke-dasharray="4,4"/>
</svg>"""


def generate_lora_svg() -> str:
    """Generates an SVG diagram for LoRA (Low-Rank Adaptation)."""
    return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 850 460" width="100%" height="100%" style="background:#0b1120; border-radius:12px; font-family:system-ui, -apple-system, sans-serif;">
  <defs>
    <linearGradient id="frozenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#475569"/>
      <stop offset="100%" stop-color="#334155"/>
    </linearGradient>
    <linearGradient id="trainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#06b6d4"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>
    <marker id="loraArrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8"/>
    </marker>
  </defs>

  <text x="425" y="32" text-anchor="middle" fill="#f8fafc" font-size="20" font-weight="700">LoRA: Low-Rank Adaptation of Large Language Models (arXiv:2106.09685)</text>
  <text x="425" y="52" text-anchor="middle" fill="#94a3b8" font-size="12">Forward Pass: h = W₀x + ΔWx = W₀x + (B · A)x · (α / r)</text>

  <!-- Input x -->
  <rect x="360" y="390" width="130" height="38" rx="8" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
  <text x="425" y="414" text-anchor="middle" fill="#f8fafc" font-size="14" font-weight="700">Input x ∈ ℝᵈ</text>

  <!-- Left Branch: Frozen Pre-trained Weight W_0 -->
  <rect x="140" y="160" width="180" height="150" rx="10" fill="url(#frozenGrad)" stroke="#94a3b8" stroke-width="1.5"/>
  <text x="230" y="210" text-anchor="middle" fill="#ffffff" font-size="16" font-weight="700">Pretrained W₀</text>
  <text x="230" y="235" text-anchor="middle" fill="#94a3b8" font-size="12">Dimension: d × k</text>
  <text x="230" y="265" text-anchor="middle" fill="#38bdf8" font-size="13" font-weight="700">❄️ FROZEN WEIGHTS</text>
  <text x="230" y="285" text-anchor="middle" fill="#cbd5e1" font-size="11">No gradient updates</text>

  <!-- Right Branch: Low-Rank Matrices A & B -->
  <rect x="520" y="250" width="190" height="55" rx="8" fill="url(#trainGrad)"/>
  <text x="615" y="275" text-anchor="middle" fill="#ffffff" font-size="14" font-weight="700">Matrix A ∈ ℝ^(r × k)</text>
  <text x="615" y="295" text-anchor="middle" fill="#e0f2fe" font-size="11">Random Gaussian Init (Trainable 🔥)</text>

  <rect x="545" y="140" width="140" height="70" rx="8" fill="url(#trainGrad)"/>
  <text x="615" y="170" text-anchor="middle" fill="#ffffff" font-size="14" font-weight="700">Matrix B ∈ ℝ^(d × r)</text>
  <text x="615" y="190" text-anchor="middle" fill="#e0f2fe" font-size="11">Zero Init (Trainable 🔥)</text>

  <text x="615" y="232" text-anchor="middle" fill="#38bdf8" font-size="12" font-weight="700">Rank r ≪ min(d, k) (e.g. r = 8)</text>

  <!-- Connecting Arrows -->
  <line x1="390" y1="390" x2="230" y2="315" stroke="#94a3b8" stroke-width="2" marker-end="url(#loraArrow)"/>
  <line x1="460" y1="390" x2="615" y2="310" stroke="#38bdf8" stroke-width="2" marker-end="url(#loraArrow)"/>
  <line x1="615" y1="250" x2="615" y2="215" stroke="#38bdf8" stroke-width="2" marker-end="url(#loraArrow)"/>

  <!-- Summation Operator (+) -->
  <circle cx="425" cy="110" r="22" fill="#8b5cf6" stroke="#c4b5fd" stroke-width="2"/>
  <text x="425" y="117" text-anchor="middle" fill="#ffffff" font-size="20" font-weight="700">+</text>

  <line x1="230" y1="160" x2="405" y2="115" stroke="#94a3b8" stroke-width="2" marker-end="url(#loraArrow)"/>
  <line x1="615" y1="140" x2="447" y2="115" stroke="#38bdf8" stroke-width="2" marker-end="url(#loraArrow)"/>

  <!-- Output h -->
  <line x1="425" y1="88" x2="425" y2="60" stroke="#22c55e" stroke-width="2.5" marker-end="url(#loraArrow)"/>
  <rect x="350" y="20" width="150" height="36" rx="8" fill="#15803d"/>
  <text x="425" y="43" text-anchor="middle" fill="#f0fdf4" font-size="13" font-weight="700">Output h = W₀x + ΔWx</text>
</svg>"""


def generate_concept_svg(concept_name: str) -> str:
    """
    Returns an interactive SVG diagram matching the concept keywords.
    """
    c = concept_name.lower()
    if "attention" in c or "qkv" in c or "dot product" in c:
        return generate_self_attention_svg()
    elif "lora" in c or "low-rank" in c or "fine-tuning" in c or "peft" in c:
        return generate_lora_svg()
    else:
        # Default to Transformer Architecture
        return generate_transformer_svg()
