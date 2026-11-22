import type { ReactNode, SVGProps } from 'react';
import type { Category } from '../lib/types';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 22, children, strokeWidth = 1.9, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const HomeIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 10.5 12 3l8 7.5" />
    <path d="M6 9.5V20a1 1 0 0 0 1 1h3.5v-5.5h3V21H17a1 1 0 0 0 1-1V9.5" />
  </Base>
);

export const BookIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19a1 1 0 0 1 1 1v13.5" />
    <path d="M4 5.5V18a3 3 0 0 0 3 3h13" />
    <path d="M8 7h8M8 11h6M8 15h4" />
  </Base>
);

export const ScanIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
    <path d="M8 12h8" />
    <path d="M12 8v8" opacity=".55" />
  </Base>
);

export const UsersIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 20c0-3.2 2.7-5.4 6-5.4s6 2.2 6 5.4" />
    <path d="M16.5 5.2a3 3 0 0 1 0 5.6M18 14.8c2 .6 3.4 2.3 3.4 4.4" />
  </Base>
);

export const UserIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="8" r="3.4" />
    <path d="M5 20.2c0-3.4 3.1-5.7 7-5.7s7 2.3 7 5.7" />
  </Base>
);

export const UserPlusIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="9.5" cy="8" r="3.3" />
    <path d="M3 20c0-3.3 2.9-5.5 6.5-5.5 1.2 0 2.3.2 3.2.6" />
    <path d="M18 14v6M15 17h6" />
  </Base>
);

export const PlusIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
);

export const ArrowUpRightIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M7 17 17 7M9 7h8v8" />
  </Base>
);

export const ArrowDownLeftIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M17 7 7 17M15 17H7V9" />
  </Base>
);

export const CheckIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </Base>
);

export const CloseIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Base>
);

export const ChevronRightIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="m9 5 7 7-7 7" />
  </Base>
);

export const ChevronLeftIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="m15 5-7 7 7 7" />
  </Base>
);

export const CameraIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.8l1.2-2h7l1.2 2h1.8A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5z" />
    <circle cx="12" cy="13" r="3.4" />
  </Base>
);

export const ImageIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2.5" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="m4.5 18 4.8-4.6a2 2 0 0 1 2.7 0L20 20" />
  </Base>
);

export const ClipboardIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="5" y="4.5" width="14" height="17" rx="2.5" />
    <path d="M9 4.5V3.8A1.3 1.3 0 0 1 10.3 2.5h3.4A1.3 1.3 0 0 1 15 3.8v.7" />
    <path d="M8.5 10h7M8.5 14h7M8.5 18h4" />
  </Base>
);

export const SparkleIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3.5c.7 3.9 2.6 5.8 6.5 6.5-3.9.7-5.8 2.6-6.5 6.5-.7-3.9-2.6-5.8-6.5-6.5 3.9-.7 5.8-2.6 6.5-6.5Z" />
    <path d="M18.5 16.5c.3 1.5 1 2.2 2.5 2.5-1.5.3-2.2 1-2.5 2.5-.3-1.5-1-2.2-2.5-2.5 1.5-.3 2.2-1 2.5-2.5Z" />
  </Base>
);

export const SearchIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </Base>
);

export const TrashIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 7h16M9.5 7V4.8A1.3 1.3 0 0 1 10.8 3.5h2.4a1.3 1.3 0 0 1 1.3 1.3V7" />
    <path d="M6.5 7l.8 12.2A1.8 1.8 0 0 0 9.1 21h5.8a1.8 1.8 0 0 0 1.8-1.8L17.5 7" />
    <path d="M10 11v6M14 11v6" />
  </Base>
);

export const EditIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 20h4.3L20 8.3a2.4 2.4 0 0 0-3.4-3.4L4.9 16.7V20Z" />
    <path d="m14.8 6.4 3 3" />
  </Base>
);

export const WhatsAppIcon = (p: IconProps) => (
  <svg width={p.size ?? 22} height={p.size ?? 22} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
    <path d="M12.04 2.5c-5.23 0-9.48 4.24-9.48 9.47 0 1.67.44 3.3 1.27 4.74L2.5 21.5l4.94-1.29a9.48 9.48 0 0 0 4.6 1.17c5.23 0 9.47-4.24 9.47-9.47 0-5.23-4.24-9.41-9.47-9.41Zm0 17.33c-1.5 0-2.97-.4-4.25-1.16l-.3-.18-3.13.82.84-3.05-.2-.31a7.86 7.86 0 0 1-1.21-4.2c0-4.34 3.53-7.87 7.88-7.87 4.34 0 7.86 3.53 7.86 7.88 0 4.35-3.52 7.87-7.49 7.87Zm4.32-5.9c-.24-.12-1.44-.71-1.66-.79-.22-.08-.38-.12-.55.12-.16.24-.63.79-.77.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.32-.75-1.8-.2-.48-.4-.41-.55-.42h-.47c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.51.58.18 1.1.16 1.51.1.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z" />
  </svg>
);

export const ShareIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="6" cy="12" r="2.4" />
    <circle cx="18" cy="6" r="2.4" />
    <circle cx="18" cy="18" r="2.4" />
    <path d="m8.2 10.9 7.6-3.8M8.2 13.1l7.6 3.8" />
  </Base>
);

export const DownloadIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3.5v11M7.8 10.6 12 14.8l4.2-4.2" />
    <path d="M4.5 17.5v1.4A1.6 1.6 0 0 0 6.1 20.5h11.8a1.6 1.6 0 0 0 1.6-1.6v-1.4" />
  </Base>
);

export const UploadIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 15.5v-11M7.8 8.4 12 4.2l4.2 4.2" />
    <path d="M4.5 17.5v1.4A1.6 1.6 0 0 0 6.1 20.5h11.8a1.6 1.6 0 0 0 1.6-1.6v-1.4" />
  </Base>
);

export const InfoIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M12 11v5.4M12 7.8h.01" />
  </Base>
);

export const ShieldIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3.2 5 6v5.4c0 4.3 2.8 7.4 7 9.4 4.2-2 7-5.1 7-9.4V6l-7-2.8Z" />
    <path d="m9 12 2 2 4-4.2" />
  </Base>
);

export const PhoneIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="6.5" y="2.5" width="11" height="19" rx="2.6" />
    <path d="M10.5 18.5h3" />
  </Base>
);

export const SettingsIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
    <circle cx="16" cy="7" r="2.2" />
    <circle cx="8" cy="17" r="2.2" />
  </Base>
);

export const CalendarIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
    <path d="M3.5 9.5h17M8 3.5V6M16 3.5V6" />
  </Base>
);

export const DotsIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="6" cy="12" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="18" cy="12" r="1.3" fill="currentColor" stroke="none" />
  </Base>
);

export const RefreshIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M20 11.5A8 8 0 0 0 6.2 6.3L4 8.5" />
    <path d="M4 4v4.5h4.5" />
    <path d="M4 12.5a8 8 0 0 0 13.8 5.2L20 15.5" />
    <path d="M20 20v-4.5h-4.5" />
  </Base>
);

export const RupeeIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M7 4.5h10M7 8.5h10M15.5 4.5c0 4-3 6-7 6h-1.5l7 9" />
  </Base>
);

export const SendIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M20.5 3.5 3.7 10.2l6.4 2.6 2.6 6.4 7.8-15.7Z" />
    <path d="m10.1 12.8 4.5-4.5" />
  </Base>
);

export function CategoryIcon({ id, size = 15 }: { id: Category; size?: number }) {
  switch (id) {
    case 'food':
      return (
        <Base size={size}>
          <path d="M4 11.5h16a8 8 0 0 1-16 0Z" />
          <path d="M9 8c0-1.2 1-1.6 1-2.8M13.5 8c0-1.2 1-1.6 1-2.8" />
          <path d="M3.5 20h17" opacity=".45" />
        </Base>
      );
    case 'travel':
      return (
        <Base size={size}>
          <path d="M6 16.5V11l2-4.5h8L18 11v5.5" />
          <path d="M5 11h14" />
          <circle cx="8.2" cy="17.5" r="1.6" />
          <circle cx="15.8" cy="17.5" r="1.6" />
          <path d="M6 14h12" opacity=".45" />
        </Base>
      );
    case 'bills':
      return (
        <Base size={size}>
          <path d="M12 3.2a5.6 5.6 0 0 1 3.4 10 1.5 1.5 0 0 0-.6 1.2v1.1h-5.6v-1.1a1.5 1.5 0 0 0-.6-1.2 5.6 5.6 0 0 1 3.4-10Z" />
          <path d="M9.8 19h4.4M10.6 21.2h2.8" />
        </Base>
      );
    case 'rent':
      return (
        <Base size={size}>
          <path d="M4 10.8 12 4l8 6.8" />
          <path d="M6.2 9.6V20h11.6V9.6" />
          <path d="M10.4 20v-4.4h3.2V20" />
        </Base>
      );
    case 'shopping':
      return (
        <Base size={size}>
          <path d="M5.2 8h13.6l-1 12H6.2L5.2 8Z" />
          <path d="M9 9V6.8a3 3 0 0 1 6 0V9" />
        </Base>
      );
    case 'fun':
      return (
        <Base size={size}>
          <path d="M4 8.4A2.4 2.4 0 0 1 6.4 6h11.2A2.4 2.4 0 0 1 20 8.4v7.2a2.4 2.4 0 0 1-2.4 2.4H6.4A2.4 2.4 0 0 1 4 15.6V8.4Z" />
          <path d="M4 10.5h16M9.5 14.5h5" />
        </Base>
      );
    case 'health':
      return (
        <Base size={size}>
          <path d="M12 20.2s-7.8-4.4-7.8-10A4.2 4.2 0 0 1 12 7.4a4.2 4.2 0 0 1 7.8 2.8c0 5.6-7.8 10-7.8 10Z" />
          <path d="M8.2 12h2.2l1.2-2 1.4 4 1-2h1.8" />
        </Base>
      );
    default:
      return (
        <Base size={size}>
          <path d="M4 6.5h7l2 2h7V19H4V6.5Z" />
          <path d="M4 11h16" opacity=".45" />
        </Base>
      );
  }
}
