# NexusClip

Plataforma para criar e gerenciar canais de cortes em múltiplas contas e plataformas.

## Sobre

NexusClip centraliza o fluxo de trabalho de cortes: da busca de vídeos longos até a exportação de trechos com formato e resolução configuráveis, com suporte futuro a múltiplas contas por usuário.

## Stack

- **Frontend:** React 19 + TypeScript + Vite
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

O Vite faz proxy de `/api` para o backend local.

## Fluxo atual

1. Busque um vídeo ou cole a URL do YouTube
2. Selecione um resultado — o editor de corte abre na hora
3. Defina um ou **vários cortes** no mesmo vídeo (intervalos podem se sobrepor)
4. Para cada corte, escolha **formato de saída** (Original, 16:9, 9:16, 1:1, 4:5), resolução e qualidade de origem
5. Visualize a área de recorte no player e arraste para reposicionar
6. Ajuste início/fim na timeline (com zoom), inputs manuais ou marcadores
7. Reproduza o preview do corte ativo e baixe o trecho recortado

## Funcionalidades do editor

| Recurso | Descrição |
| --- | --- |
| Múltiplos cortes | Vários intervalos independentes no mesmo vídeo |
| Timeline interativa | Cursores verticais, zoom, pan e playhead |
| Formato por corte | Proporção e resolução (1080p / 720p / 480p) individuais |
| Preview de recorte | Overlay no player mostra a área exportada |
| Exportação | FFmpeg recorta, redimensiona e converte conforme o corte ativo |

## API

| Endpoint | Descrição |
| --- | --- |
| `GET /api/health` | Status do serviço (yt-dlp, FFmpeg) |
| `GET /api/formats?videoId=` | Formatos disponíveis para download |
| `GET /api/download?videoId=&quality=` | Download do vídeo completo |
| `GET /api/clip?videoId=&start=&end=&quality=&aspectRatio=&outputHeight=&cropFocusX=&cropFocusY=` | Download do corte com formato |

Parâmetros de formato em `/api/clip`:

- `aspectRatio`: `original`, `16:9`, `9:16`, `1:1`, `4:5`
- `outputHeight`: `1080`, `720` ou `480` (menor aresta do vídeo exportado)
- `cropFocusX`, `cropFocusY`: posição do recorte (`0` a `1`, padrão `0.5`)

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento do frontend |
| `npm run build` | Build de produção do frontend |
| `python backend/app.py` | API local de download e recorte |
