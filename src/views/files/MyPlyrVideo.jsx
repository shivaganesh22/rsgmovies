// Import necessary modules
import React, { useRef, useEffect } from "react";
import Plyr from "plyr-react";
import "plyr-react/plyr.css"; // Import the Plyr styles

// Functional component using Plyr
function MyPlyrVideo({ videoSrc }) {
  const ref = useRef();

  const plyrProps = {
    source: {
      type: "video",
      sources: [
        {
          src: videoSrc, // Dynamic video URL from zprops
          provider: "html5", // Provider set to "html5" for remote links
        },
      ],
    },
    // options: {
    //   controls: ["play", "progress", "volume", "fullscreen"],
    //   autoplay: false,
    // },
  };

  useEffect(() => {
    if (ref.current) {
      console.log("Plyr instance:", ref.current.plyr);
      // Example: You can programmatically enter fullscreen mode
      // ref.current.plyr.fullscreen.enter();
    }
  }, []);

  return <Plyr {...plyrProps} ref={ref} />;
}

export default MyPlyrVideo;
