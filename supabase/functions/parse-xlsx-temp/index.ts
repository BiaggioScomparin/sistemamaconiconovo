import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const fileUrl = "https://fqvvfslqeajyrgyvjwpp.supabase.co/storage/v1/object/public/library/temp%2FPessoas_1.xlsx";
    const response = await fetch(fileUrl);
    const arrayBuffer = await response.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    
    // Manual xlsx parsing - xlsx is a zip file
    // Use Deno's built-in zip handling or parse manually
    // Actually, let's use a simpler approach - convert to CSV using a basic parser
    
    // For xlsx, we need to decompress and parse XML
    // Let's use the fflate library available in Deno
    const { unzipSync } = await import("https://esm.sh/fflate@0.8.2");
    
    const unzipped = unzipSync(data);
    
    // Get shared strings
    const sharedStringsData = unzipped["xl/sharedStrings.xml"];
    const sharedStringsXml = new TextDecoder().decode(sharedStringsData);
    
    // Parse shared strings
    const sharedStrings: string[] = [];
    const siRegex = /<si>(.*?)<\/si>/gs;
    let siMatch;
    while ((siMatch = siRegex.exec(sharedStringsXml)) !== null) {
      const tRegex = /<t[^>]*>(.*?)<\/t>/gs;
      let text = "";
      let tMatch;
      while ((tMatch = tRegex.exec(siMatch[1])) !== null) {
        text += tMatch[1];
      }
      sharedStrings.push(text);
    }
    
    // Get sheet1 data
    const sheet1Data = unzipped["xl/worksheets/sheet1.xml"];
    const sheet1Xml = new TextDecoder().decode(sheet1Data);
    
    // Parse cells
    const rows: Record<string, string>[][] = [];
    const rowRegex = /<row[^>]*>(.*?)<\/row>/gs;
    let rowMatch;
    const allRows: { ref: string; type: string; value: string }[][] = [];
    
    while ((rowMatch = rowRegex.exec(sheet1Xml)) !== null) {
      const cells: { ref: string; type: string; value: string }[] = [];
      const cellRegex = /<c\s+r="([^"]+)"(?:\s+t="([^"]*)")?[^>]*>(?:<v>([^<]*)<\/v>)?/g;
      let cellMatch;
      while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
        cells.push({
          ref: cellMatch[1],
          type: cellMatch[2] || "",
          value: cellMatch[3] || "",
        });
      }
      allRows.push(cells);
    }
    
    // First row is headers
    const headers: string[] = [];
    if (allRows.length > 0) {
      for (const cell of allRows[0]) {
        if (cell.type === "s") {
          headers.push(sharedStrings[parseInt(cell.value)] || "");
        } else {
          headers.push(cell.value);
        }
      }
    }
    
    // Parse data rows
    const result: Record<string, string>[] = [];
    for (let i = 1; i < allRows.length; i++) {
      const row: Record<string, string> = {};
      for (const cell of allRows[i]) {
        // Get column index from cell ref (e.g., "A2" -> 0, "B2" -> 1)
        const colLetters = cell.ref.replace(/[0-9]/g, "");
        let colIndex = 0;
        for (let j = 0; j < colLetters.length; j++) {
          colIndex = colIndex * 26 + (colLetters.charCodeAt(j) - 64);
        }
        colIndex -= 1; // 0-indexed
        
        const header = headers[colIndex];
        if (header) {
          if (cell.type === "s") {
            row[header] = sharedStrings[parseInt(cell.value)] || "";
          } else {
            row[header] = cell.value;
          }
        }
      }
      result.push(row);
    }

    return new Response(JSON.stringify({ headers, data: result, sharedStrings: sharedStrings.slice(0, 50) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
