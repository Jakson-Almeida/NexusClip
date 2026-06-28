import { useState } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import SearchBar from "./components/SearchBar";
import VideoResults from "./components/VideoResults";
import VideoWorkspace from "./components/VideoWorkspace";
import { searchVideos } from "./services/youtubeApi";
import type { YouTubeSearchItem } from "./types/youtube";

export default function App() {
  const [videos, setVideos] = useState<YouTubeSearchItem[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<YouTubeSearchItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (query: string) => {
    setLoading(true);
    setError(null);
    setSelectedVideo(null);

    try {
      const results = await searchVideos(query);
      setVideos(results);
      setHasSearched(true);

      if (results.length === 1) {
        setSelectedVideo(results[0]);
      }
    } catch (err) {
      setVideos([]);
      setHasSearched(true);
      setError(err instanceof Error ? err.message : "Erro ao buscar vídeos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <Header />
      <main className="main-content">
        <section className="intro">
          <h1 className="intro-title">Encontre o vídeo e selecione o corte</h1>
          <p className="intro-text">
            Busque podcasts, entrevistas ou qualquer vídeo do YouTube. Escolha manualmente
            o intervalo que deseja exportar.
          </p>
        </section>

        <SearchBar onSearch={handleSearch} loading={loading} />

        {error && <p className="form-error centered">{error}</p>}

        {hasSearched && !loading && (
          <VideoResults
            videos={videos}
            selectedVideoId={selectedVideo?.id.videoId}
            onSelect={setSelectedVideo}
          />
        )}

        {selectedVideo && <VideoWorkspace video={selectedVideo} />}
      </main>
      <Footer />
    </div>
  );
}
