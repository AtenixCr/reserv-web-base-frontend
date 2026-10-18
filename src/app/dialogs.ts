import Swal from 'sweetalert2';

type Translate = (key: string) => string;

export async function confirmDiscard(t: Translate): Promise<boolean> {
  const result = await Swal.fire({
    title: t('discard'),
    text: t('discardWarning'),
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: t('discardConfirm'),
    cancelButtonText: t('cancel'),
    confirmButtonColor: '#164A3F',
    cancelButtonColor: '#777777'
  });
  return result.isConfirmed;
}

export async function showError(t: Translate, code: string): Promise<void> {
  await Swal.fire({
    title: t('error'),
    text: t(code),
    icon: 'error',
    confirmButtonText: t('dismiss'),
    confirmButtonColor: '#164A3F'
  });
}
