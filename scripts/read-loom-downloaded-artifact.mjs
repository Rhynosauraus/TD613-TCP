import { execFileSync } from 'node:child_process';

const MAX_DOWNLOAD_BYTES = 32 * 1024 * 1024;
const ZIP_SESSION_READER = `import io, pathlib, stat, sys, zipfile
data = sys.stdin.buffer.read()
with zipfile.ZipFile(io.BytesIO(data)) as archive:
    members = archive.infolist()
    if not 1 <= len(members) <= 64:
        raise ValueError('bounded ZIP member count required')
    names = [member.filename for member in members]
    if len(set(names)) != len(names):
        raise ValueError('duplicate ZIP member')
    if sum(member.file_size for member in members) > 32 * 1024 * 1024:
        raise ValueError('ZIP expanded size exceeds bound')
    for member in members:
        name = member.filename
        parts = name.rstrip('/').split('/')
        if not name or name.startswith('/') or '\\\\' in name or any(part in ('', '.', '..') for part in parts):
            raise ValueError('unsafe ZIP member path')
        if member.flag_bits & 1 or member.compress_type not in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED):
            raise ValueError('unsupported ZIP member encoding')
        if member.file_size > 8 * 1024 * 1024 or stat.S_ISLNK(member.external_attr >> 16):
            raise ValueError('unsafe ZIP member type or size')
    if names.count('loom-portable-session.json') != 1:
        raise ValueError('exact Loom session member required')
    if archive.testzip() is not None:
        raise ValueError('ZIP member CRC mismatch')
    sys.stdout.buffer.write(archive.read('loom-portable-session.json'))
`;

/** Read a downloaded session ZIP or a legacy/plain JSON artifact. Nothing is
 * extracted to disk or executed; ZIP member lengths, paths and CRCs are checked.
 */
export function parseLoomDownloadedArtifact(input) {
  const bytes = Buffer.from(input);
  if (!bytes.length || bytes.length > MAX_DOWNLOAD_BYTES) throw new Error('LOOM_DOWNLOAD_SIZE_INVALID');
  if (bytes.length < 4 || bytes.readUInt32LE(0) !== 0x04034b50) return JSON.parse(bytes.toString('utf8'));
  let text;
  try {
    text = execFileSync('python3', ['-c', ZIP_SESSION_READER], {
      input: bytes, encoding: 'utf8', maxBuffer: MAX_DOWNLOAD_BYTES,
      timeout: 10000, stdio: ['pipe', 'pipe', 'pipe']
    });
  } catch (error) {
    throw new Error('LOOM_DOWNLOAD_ARCHIVE_INVALID', { cause: error });
  }
  const artifact = JSON.parse(text);
  if (artifact?.schema !== 'td613.loom.portable-session-export/v0.1') throw new Error('LOOM_DOWNLOAD_SESSION_SCHEMA_INVALID');
  return artifact;
}

export function loomDownloadedArtifactName(requestedName, suggestedName) {
  return /\.zip$/i.test(suggestedName) ? requestedName.replace(/\.json$/i, '.zip') : requestedName;
}
