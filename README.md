# App logos (optional)

This folder is empty on purpose. YouTube, Netflix, Prime Video and TOD logos are trademarks of their
owners; the project does not ship them.

If you decide to use official logos:

1. Download them from each brand's official brand-resources page and check its usage guidelines
   (some brands restrict use inside third-party apps; store review may also ask about it).
2. Save each one here as a square PNG, about 256×256:

   | App         | File name         |
   |-------------|-------------------|
   | YouTube     | `youtube.png`     |
   | Netflix     | `netflix.png`     |
   | Prime Video | `prime-video.png` |
   | TOD         | `tod.png`         |

3. In `src/constants/app-logos.ts`, uncomment the line for each file you added.
   Only uncomment lines whose file exists, otherwise the build fails.

Apps without a logo keep the letter badge.