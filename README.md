# NexusClip

Plataforma para criar e gerenciar canais de cortes em múltiplas contas e plataformas.

## Sobre

NexusClip centraliza o fluxo de trabalho de cortes: da busca de vídeos longos até a exportação manual de trechos, com suporte futuro a múltiplas contas por usuário.

## Stack

- **Frontend:** React + TypeScript + Vite
- **Backend:** Python + Flask + yt-dlp + FFmpeg

## Pré-requisitos

- Node.js 18+
- Python 3.10+
- FFmpeg instalado e disponível no `PATH`

## Configuração

Copie `.env.example` para `.env` e configure:

```env
REACT_APP_YOUTUBE_API_KEY=sua_chave_da_api_youtube
VITE_API_URL=http://localhost:5000
```

Para downloads mais confiáveis (como no projeto YoutubeShortAPI), configure cookies do YouTube no backend:

```env
YOUTUBE_COOKIES_FILE=caminho/para/cookies.txt
```

## Desenvolvimento

Terminal 1 — backend:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Terminal 2 — frontend:

```bash
npm install
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

## Fluxo atual

1. Busque um vídeo ou cole a URL do YouTube
2. Selecione um resultado e visualize no player
3. Marque manualmente início e fim do corte
4. Baixe o trecho recortado via API

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento do frontend |
| `npm run build` | Build de produção do frontend |
| `python backend/app.py` | API local de download e recorte |

## Licença

Projeto privado.
