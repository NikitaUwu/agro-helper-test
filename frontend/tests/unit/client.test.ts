import { it, expect, vi } from 'vitest';
import { analyzeLeaf, disposeDiagnosisWorker } from '@/lib/diagnosis/client';
import { validateImage, ImageInputError } from '@/lib/diagnosis/preprocess';

vi.mock('@/lib/diagnosis/preprocess', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/diagnosis/preprocess')>(), validateImage: vi.fn(),
}));

it('cancelling while decoding immediately releases the slot for another photo', async () => {
  disposeDiagnosisWorker();
  let completeDecode!: (image: ImageBitmap) => void;
  vi.mocked(validateImage).mockImplementationOnce(() => new Promise(resolve => { completeDecode = resolve; }));
  const firstController = new AbortController();
  const first = analyzeLeaf({ requestId:'first', image:new Blob(), source:'upload' }, () => {}, firstController.signal);
  firstController.abort();
  vi.mocked(validateImage).mockRejectedValueOnce(new ImageInputError('invalid_file', 'bad image'));
  const second = await analyzeLeaf({ requestId:'second', image:new Blob(), source:'upload' }, () => {}, new AbortController().signal);
  const close = vi.fn(); completeDecode({ close } as unknown as ImageBitmap);
  expect(await first).toMatchObject({ status:'cancelled',requestId:'first' });
  expect(close).toHaveBeenCalledOnce();
  expect(second).toMatchObject({ status:'error',reason:'invalid_file',requestId:'second' });
});
