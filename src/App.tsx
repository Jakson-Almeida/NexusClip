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

  const handleVideoSelect = (video: YouTubeSearchItem) => {
    setSelectedVideo(video);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBackToResults = () => {
    setSelectedVideo(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSearch = async (query: string) => {
    setLoading(true);
    setError(null);
    setSelectedVideo(null);

    try {
      const results = await searchVideos(query);
      setVideos(results);
      setHasSearched(true);

      if (results.length === 1) {
        handleVideoSelect(results[0]);
      }
    } catch (err) {
      setVideos([]);
      setHasSearched(true);
      setError(err instanceof Error ? err.message : "Erro ao buscar vídeos.");
    } finally {
      setLoading(false);
    }
  };

  const isClipView = selectedVideo !== null;

  return (
    <div className="app">
      <Header />
      <main className={`main-content${isClipView ? " main-content--clip" : ""}`}>
        {!isClipView && (
          <section className="intro">
            <h1 className="intro-title">Encontre o vídeo e selecione o corte</h1>
            <p className="intro-text">
              Busque podcasts, entrevistas ou qualquer vídeo do YouTube. Escolha manualmente
              o intervalo que deseja exportar.
            </p>
          </section>
        )}

        {!isClipView && <SearchBar onSearch={handleSearch} loading={loading} />}

        {!isClipView && error && <p className="form-error centered">{error}</p>}

        {!isClipView && hasSearched && !loading && (
          <VideoResults videos={videos} onSelect={handleVideoSelect} />
        )}

        {isClipView && selectedVideo && (
          <VideoWorkspace video={selectedVideo} onBack={handleBackToResults} />
        )}
      </main>
      <Footer />
    </div>
  );
}
