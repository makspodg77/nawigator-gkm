import { useState } from "react";
import styles from "./loading.module.css";
import crest from "../../../../assets/Herb-Goleniowa-powiat.webp";
const LoadingMenuState = () => {
  const texts = [
    "Aplikacja działa lepiej, gdy punkty są w obszarze powiatu goleniowskiego.",
    "Szukanie tras opiera się na algorytmie Connection Scan Algorithm (SCA).",
    "Dorzucamy węgla do pieca...",
    "Nakręcamy korbę...",
    "Zapraszamy również na stronę www.komunikacjagoleniow.pl – ewentualnie – www.goleniowkm.pl.",
    "Ładowanie...",
    "Gdzie jedziesz?",
    "Ekosystem rozwijamy już od dwóch lat!",
    "Pierwszą linią była linia 95 na trasie Kliniska Rzemieślnicza ⇔ Wolińska.",
    "Najdłuższą linią w historii systemu była linia 305; przez pewien okres podróż trwała ponad 2\u00A0godziny!",
    "Linia 92 pierwotnie nosiła numer 22, a trasa w stronę Podańska zaczynała się przy dworcu w Goleniowie.",
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
