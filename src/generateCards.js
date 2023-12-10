
import words from "./words.js";


const chooseRandomIndexes = (arr, numIndexes) => {
    const indexes = [];
    const maxIndex = arr.length;
  
    while (indexes.length < numIndexes) {
      const randomIndex = Math.floor(Math.random() * maxIndex);
      if (!indexes.includes(randomIndex)) {
        indexes.push(randomIndex);
      }
    }
  
    return indexes;
  };
  
  const getRandomColor = () => {
    const randomNum = Math.random();
    return randomNum < 0.5 ? "red" : "blue";
  };
  
  export default function generateCards() {
    const randomIndexes = chooseRandomIndexes(words, 25);
    const selectedWords = randomIndexes.map((index) => words[index]);
    const begginer = getRandomColor();
    const indexArray = Array.from({ length: 25 }, (_, index) => index);
    const shuffled = indexArray.sort(() => 0.5 - Math.random());
  
    return shuffled.map((number, index) => {
      let word = selectedWords[index];
      let color;
      if (number < 9) {
        if (begginer === "red") {
          color = "red";
        } else {
          color = "blue";
        }
      } else if (number < 17) {
        if (begginer === "red") {
          color = "blue";
        } else {
          color = "red";
        }
      } else if (number < 24) {
        color = "yellow";
      } else {
        color = "black";
      }
      return { word, color, begginer };
    });
  };
  

  