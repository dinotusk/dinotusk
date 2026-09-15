const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const SCRIPT_TAG_ID = '_br_com_seatecnologia_in_buscadou_BuscaDouPortlet_params';

app.use(express.static(path.join(__dirname, 'public')));

app.get('/buscar', async (req, res) => {
  const termo = (req.query.q || '').trim();

  if (!termo) {
    return res.status(400).json({ erro: 'Informe um termo de busca (parametro q).' });
  }

  try {
    const url = `https://www.in.gov.br/consulta/-/buscar/dou?q=${encodeURIComponent(termo)}&s=todos`;
    const resposta = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
    });

    if (!resposta.ok) {
      return res.status(502).json({ erro: `Falha ao consultar o DOU (status ${resposta.status}).` });
    }

    const html = await resposta.text();
    const regex = new RegExp(
      `<script id="${SCRIPT_TAG_ID}" type="application/json">([\\s\\S]*?)</script>`
    );
    const match = html.match(regex);

    if (!match) {
      return res.json({ resultados: [] });
    }

    const dados = JSON.parse(match[1]);
    const jsonArray = dados.jsonArray || [];

    const resultados = jsonArray.map((item) => ({
      titulo: item.title,
      data: item.pubDate,
      orgao: item.hierarchyStr,
      secao: item.pubName,
      trecho: (item.content || '').replace(/<\/?span[^>]*>/g, ''),
      link: `https://www.in.gov.br/web/dou/-/${item.urlTitle}`,
    }));

    res.json({ resultados });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro interno ao buscar no DOU.' });
  }
});

app.listen(PORT, () => {
  console.log(`Busca DOU rodando em http://localhost:${PORT}`);
});
