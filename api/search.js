export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { stage, region, industries, signals, context } = req.body;

  const system = `Eres un agente de prospección B2B experto en identificar startups que necesitan desarrollo de software a medida y servicios cloud AWS. Devuelve SOLO JSON válido sin backticks ni texto extra con este formato exacto:
{"leads":[{"company":"nombre","description":"qué hacen en 1 línea","score":0-100,"signals":["señal1","señal2","señal3"],"angle":"2 oraciones: por qué contactarlos ahora y cómo conectar con su dolor específico","contact":"nombre del decisor","role":"cargo exacto"}]}
Genera exactamente 4 leads reales o muy plausibles del ecosistema indicado. Score basado en: ronda reciente(30pts) + señales de contratación tech(25pts) + tamaño equipo(20pts) + claridad del dolor(25pts).`;

  const user = `Encuentra startups ${stage} en ${region}, verticales: ${industries.join(', ')}. Señales buscadas: ${signals.join(', ')}.${context ? ' Contexto empresa: ' + context : ''} Prioriza startups que necesiten escalar capacidad tecnológica con un partner AWS externo. Somos AWS Advanced Partner especializados en migraciones, modernizaciones, IoT, Data Analytics, AI/ML, Well-Architected Review y AWS Marketplace.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        system,
        messages: [{ role: 'user', content: user }],
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json({ error: err.error?.message || 'API error' });
    }

    const data = await response.json();
    const text = data.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    const match = text.replace(/```json|```/g, '').trim().match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: 'No se pudo parsear la respuesta' });

    const parsed = JSON.parse(match[0]);
    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
