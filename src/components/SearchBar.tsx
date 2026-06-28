import { type FormEvent, useState } from "react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  loading: boolean;
}

export default function SearchBar({ onSearch, loading }: SearchBarProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <form className="search-bar" onSubmit={handleSubmit}>
      <input
        type="search"
        className="search-input"
        placeholder="Busque um vídeo ou cole a URL do YouTube"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        disabled={loading}
      />
      <button type="submit" className="btn btn-primary" disabled={loading || !query.trim()}>
        {loading ? "Buscando..." : "Buscar"}
      </button>
    </form>
  );
}
