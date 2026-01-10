// SHA-256 hashing utility for resource checksums

export async function calculateSHA256(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export async function calculateSHA256FromFile(file: File): Promise<string> {
  return calculateSHA256(file);
}

export async function verifyChecksum(blob: Blob, expectedHash: string): Promise<boolean> {
  const actualHash = await calculateSHA256(blob);
  return actualHash === expectedHash;
}
