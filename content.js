(function () {
  // add delay to wait for commit graph to hydrate
  setTimeout(() => {
    console.log("yo from script");
    // Only run on contribution graph pages
    const table = document.querySelector("table.ContributionCalendar-grid");
    if (!table) return;

    const playButton = document.createElement("button");
    playButton.textContent = "▶/■";
    playButton.style = "font-size: 9px;display:inline-block;width:42px;";
    table.appendChild(playButton);

    // Parse the table directly from the DOM

    const data = Array.from(table.querySelectorAll("tbody td"))
      .map((e) => {
        const id = e.getAttribute("id");
        if (!id) return;
        const level = parseInt(e.getAttribute("data-level"));
        const col = parseInt(e.getAttribute("data-ix"));
        const rowMatch = id.match(/contribution-day-component-(\d+)-(\d+)/);
        if (!rowMatch) return;
        const row = parseInt(rowMatch[1]);
        return {
          id: `${col}-${row}`,
          level,
          col,
          row,
        };
      })
      .filter(Boolean);

    console.log(data);
    // = last data entry + 1 (0 indexed weeks)
    const WEEKS = data[data.length - 1].col + 1;
    console.log({ WEEKS });

    // Music logic
    const synth = new Tone.PolySynth().toDestination();
    const notes = ["C4", "D4", "E4", "G4", "A4", "B4", "F4"];
    const drumSamples = [
      chrome.runtime.getURL("drums/kick.mp3"),
      chrome.runtime.getURL("drums/snare.mp3"),
      chrome.runtime.getURL("drums/cengceng.wav"),
      chrome.runtime.getURL("drums/clap.wav"),
      chrome.runtime.getURL("drums/clave.wav"),
      chrome.runtime.getURL("drums/rim.wav"),
      chrome.runtime.getURL("drums/hihat.mp3"),
    ];

    const samples = {};
    notes.forEach((n, i) => {
      samples[n] = drumSamples[i];
    });

    console.log({ samples });

    const sampler = new Tone.Sampler(samples).toDestination();

    const sequence = Array(WEEKS)
      .fill()
      .map(() => Array(7).fill(0));
    data.forEach((d) => {
      if (
        d &&
        typeof d.col === "number" &&
        typeof d.row === "number" &&
        d.col >= 0 &&
        d.col < WEEKS &&
        d.row >= 0 &&
        d.row < 7
      ) {
        sequence[d.col][d.row] = d.level;
      }
    });

    let isPlaying = false;
    let currentStep = 0;
    let prevStep = null;

    function highlightColumn(col) {
      // Remove highlight from previous column
      if (prevStep !== null) {
        document.querySelectorAll(`td[data-ix="${prevStep}"]`).forEach((td) => {
          td.classList.remove("gh-music-highlight");
        });
      }
      // Add highlight to current column
      document.querySelectorAll(`td[data-ix="${col}"]`).forEach((td) => {
        td.classList.add("gh-music-highlight");
      });
      prevStep = col;
    }

    const loop = new Tone.Loop((time) => {
      highlightColumn(currentStep);
      for (let row = 0; row < 7; row++) {
        const level = sequence[currentStep][row];
        if (level > 0) {
          const note = notes[row % notes.length];
          const velocity = 0.3 + level * 0.15;
          sampler.triggerAttackRelease(note, "8n", time, velocity);
        }
      }
      currentStep = (currentStep + 1) % WEEKS;
    }, "8n");

    Tone.Transport.bpm.value = 200;

    playButton.addEventListener("click", async () => {
      await Tone.start();
      if (!isPlaying) {
        Tone.Transport.start();
        loop.start();
      } else {
        Tone.Transport.stop();
        loop.stop();
      }
      isPlaying = !isPlaying;
    });
  }, 2000);

  const style = document.createElement("style");
  style.textContent = `
.gh-music-highlight {
  outline: 2px solid #ff9800 !important;
  box-shadow: 0 0 8px #ff9800 !important;
}
`;
  document.head.appendChild(style);
})();
