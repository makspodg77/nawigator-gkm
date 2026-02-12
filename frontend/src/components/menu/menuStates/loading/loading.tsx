import { useState } from "react";
import styles from "./loading.module.css";
import crest from "../../../../assets/Herb-Goleniowa-powiat.webp";
const LoadingMenuState = () => {
  const texts = [
    "Aplikacja działa lepiej, gdy punkty są w\u00A0obszarze powiatu goleniowskiego.",
    "Szukanie tras opiera się na\u00A0algorytmie Connection Scan Algorithm (SCA).",
    "Dorzucamy węgla do\u00A0pieca...",
    "Nakręcamy korbę...",
    "Zapraszamy również na\u00A0stronę www.komunikacjagoleniow.pl – ewentualnie – www.goleniowkm.pl.",
    "Ładowanie...",
    "Gdzie jedziesz?",
    "Ekosystem rozwijamy już od\u00A0dwóch lat!",
    "Pierwszą linią była linia\u00A095 na\u00A0trasie Kliniska Rzemieślnicza ⇔ Wolińska.",
    "Najdłuższą linią w\u00A0historii systemu była linia\u00A0305; przez pewien okres podróż trwała ponad\u00A02\u00A0godziny!",
    "Linia\u00A092 pierwotnie nosiła numer\u00A022, a\u00A0trasa w\u00A0stronę Podańska zaczynała się przy\u00A0dworcu w\u00A0Goleniowie.",
  ];

  const [randomText] = useState(() => {
    const num_id = Math.floor(Math.random() * texts.length);
    return texts[num_id];
  });

  return (
    <div className={styles.container}>
      <div className={styles.up}>
        <img src={crest} width={80} alt="Herb powiatu goleniowskiego" />
        <div>{randomText}</div>
      </div>
      <div className={styles.down}>
        <p>Goleniowska Komunikacja Miejska</p>
        <p>Max Podgórski</p>
      </div>
    </div>
  );
};

export default LoadingMenuState;
