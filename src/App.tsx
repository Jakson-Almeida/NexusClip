import Header from "./components/Header";
import Hero from "./components/Hero";
import Footer from "./components/Footer";

export default function App() {
  return (
    <div className="app">
      <Header />
      <main>
        <Hero />
      </main>
      <Footer />
    </div>
  );
}
