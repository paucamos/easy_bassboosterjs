document.addEventListener("DOMContentLoaded", function () {
  const audioPlayer = document.getElementById("audioPlayer");
  const songInput = document.getElementById("songInput");
  const speedSelect = document.getElementById("speed");
  const bassBoostSlider = document.getElementById("bassBoost");
  const downloadButton = document.getElementById("downloadButton");

  let audioContext;
  let sourceNode;
  let bassBoostFilter;

  function initializeAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    sourceNode = audioContext.createMediaElementSource(audioPlayer);
    bassBoostFilter = audioContext.createBiquadFilter();
    sourceNode.connect(bassBoostFilter);

    // Conectar el nodo de filtro de bajos a la salida de audio
    bassBoostFilter.connect(audioContext.destination);
  }

  function resetAudioSettings() {
    speedSelect.value = "1";
    audioPlayer.playbackRate = 1;
    bassBoostSlider.value = 0;
    deactivateBassBoost();
  }

  function activateBassBoost(gainValue) {
    try {
      if (!audioContext || audioContext.state !== "running") {
        initializeAudio();
      }
      bassBoostFilter.type = "lowshelf";
      bassBoostFilter.frequency.value = 100;
      bassBoostFilter.gain.value = gainValue;
    } catch (error) {
      console.error("Error al conectar nodos de audio:", error);
    }
  }

  function deactivateBassBoost() {
    if (bassBoostFilter) {
      bassBoostFilter.gain.value = 0;
    }
  }

  function applyTimeStretching(tempo) {
    if (!audioPlayer.buffer) {
      // Si el buffer del audioPlayer no está definido, no hagas nada
      return;
    }

    const originalPlaybackRate = 1.0;
    const playbackRateRatio = tempo / originalPlaybackRate;

    const buffer = audioContext.createBuffer(
      1,
      audioPlayer.buffer.length,
      audioContext.sampleRate
    );
    const channelData = buffer.getChannelData(0);

    const playbackRate = Math.max(playbackRateRatio, 0.1);

    for (let i = 0; i < audioPlayer.buffer.length; i++) {
      const position = i / playbackRate;

      const leftIndex = Math.floor(position);
      const rightIndex = Math.ceil(position);

      if (
        audioPlayer.buffer.getChannelData(0)[leftIndex] === undefined ||
        audioPlayer.buffer.getChannelData(0)[rightIndex] === undefined
      ) {
        // Manejar casos en los que no hay datos definidos para leftIndex o rightIndex
        channelData[i] = 0;
      } else {
        const leftSample = audioPlayer.buffer.getChannelData(0)[leftIndex];
        const rightSample = audioPlayer.buffer.getChannelData(0)[rightIndex];

        const fraction = position - leftIndex;
        const interpolatedSample =
          leftSample + fraction * (rightSample - leftSample);

        channelData[i] = interpolatedSample;
      }
    }

    sourceNode.buffer = buffer;
  }

  songInput.addEventListener("change", function () {
    const file = this.files[0];
    if (file) {
      audioPlayer.pause();
      audioPlayer.currentTime = 0;
      resetAudioSettings();
      const objectURL = URL.createObjectURL(file);
      audioPlayer.src = objectURL;
      audioPlayer.play();
    }
  });

  speedSelect.addEventListener("change", function () {
    const tempo = parseFloat(this.value);
    audioPlayer.playbackRate = tempo;

    if (audioContext) {
      applyTimeStretching(tempo);
    }
  });

  bassBoostSlider.addEventListener("input", function () {
    const bassBoostValue = parseFloat(this.value);
    if (bassBoostValue > 0) {
      activateBassBoost(bassBoostValue);
    } else {
      deactivateBassBoost();
    }
  });
});
