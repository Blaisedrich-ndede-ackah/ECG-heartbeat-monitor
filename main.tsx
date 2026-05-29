@import "tailwindcss";

html,
body,
#root {
  height: 100%;
}

body {
  margin: 0;
  background: #05070a;
}

/* Custom range slider */
.ecg-slider {
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.12);
  outline: none;
  cursor: pointer;
}

.ecg-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #eafff2;
  border: 3px solid currentColor;
  box-shadow: 0 0 12px rgba(34, 227, 107, 0.6);
}

.ecg-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #eafff2;
  border: 3px solid #22e36b;
  box-shadow: 0 0 12px rgba(34, 227, 107, 0.6);
}
