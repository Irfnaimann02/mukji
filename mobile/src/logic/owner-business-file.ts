/** Read a browser document-picker URI (normally blob: or http(s)) into bytes. */
export async function readWebOwnerBusinessFile(uri: string): Promise<ArrayBuffer> {
  const response = await fetch(uri);
  if (!response.ok) throw new Error('Could not read the selected document.');
  return response.arrayBuffer();
}
