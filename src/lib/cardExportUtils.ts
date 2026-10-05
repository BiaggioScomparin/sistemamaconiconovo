import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Capture a card DOM element at 4x Retina Scale (300+ DPI) with zero layout clipping or distortion.
 */
export async function captureCardCanvas(element: HTMLElement, scale = 4): Promise<HTMLCanvasElement> {
  return await html2canvas(element, {
    scale,
    backgroundColor: null,
    useCORS: true,
    allowTaint: true,
    logging: false,
    windowWidth: 1200, // Ensures text doesn't truncate or break on small mobile viewports during capture
  });
}

/**
 * Download a single card side (Front or Back) as a crisp, ultra-high-definition PNG image for mobile gallery.
 */
export async function downloadCardImageHD(
  element: HTMLElement | null,
  filename: string,
  onStart?: () => void,
  onEnd?: () => void
): Promise<void> {
  if (!element) return;
  try {
    if (onStart) onStart();
    const canvas = await captureCardCanvas(element, 4);
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
  } catch (error) {
    console.error('Error exporting card image HD:', error);
    throw error;
  } finally {
    if (onEnd) onEnd();
  }
}

/**
 * Combine Front and Back sides into a single, stacked high-definition PNG image for mobile gallery saving.
 */
export async function downloadCombinedCardImageHD(
  frontElement: HTMLElement | null,
  backElement: HTMLElement | null,
  filename: string,
  onStart?: () => void,
  onEnd?: () => void
): Promise<void> {
  if (!frontElement || !backElement) return;
  try {
    if (onStart) onStart();

    const canvasFront = await captureCardCanvas(frontElement, 4);
    const canvasBack = await captureCardCanvas(backElement, 4);

    const padding = 40; // Space between front and back cards
    const combinedCanvas = document.createElement('canvas');
    combinedCanvas.width = Math.max(canvasFront.width, canvasBack.width);
    combinedCanvas.height = canvasFront.height + canvasBack.height + padding;

    const ctx = combinedCanvas.getContext('2d');
    if (ctx) {
      // Background dark fill
      ctx.fillStyle = '#0b0f19';
      ctx.fillRect(0, 0, combinedCanvas.width, combinedCanvas.height);

      // Draw Front Card centered
      const xFront = (combinedCanvas.width - canvasFront.width) / 2;
      ctx.drawImage(canvasFront, xFront, 0);

      // Draw Back Card centered
      const xBack = (combinedCanvas.width - canvasBack.width) / 2;
      ctx.drawImage(canvasBack, xBack, canvasFront.height + padding);
    }

    const link = document.createElement('a');
    link.download = `${filename}-completa.png`;
    link.href = combinedCanvas.toDataURL('image/png', 1.0);
    link.click();
  } catch (error) {
    console.error('Error exporting combined card image HD:', error);
    throw error;
  } finally {
    if (onEnd) onEnd();
  }
}

/**
 * Download official Credit Card format PDF (Landscape 85.6mm x 53.98mm)
 */
export async function downloadCardPDF(
  frontElement: HTMLElement | null,
  backElement: HTMLElement | null,
  filename: string,
  onStart?: () => void,
  onEnd?: () => void
): Promise<void> {
  if (!frontElement || !backElement) return;
  try {
    if (onStart) onStart();

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [85.6, 53.98],
    });

    const canvasFront = await captureCardCanvas(frontElement, 3);
    const imgFront = canvasFront.toDataURL('image/png');
    pdf.addImage(imgFront, 'PNG', 0, 0, 85.6, 53.98);

    pdf.addPage([85.6, 53.98], 'landscape');
    const canvasBack = await captureCardCanvas(backElement, 3);
    const imgBack = canvasBack.toDataURL('image/png');
    pdf.addImage(imgBack, 'PNG', 0, 0, 85.6, 53.98);

    pdf.save(`${filename}.pdf`);
  } catch (error) {
    console.error('Error exporting card PDF:', error);
    throw error;
  } finally {
    if (onEnd) onEnd();
  }
}
