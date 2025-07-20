import * as React from 'react';

export const Logo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <path d="m11.5 16.5-2-2.5 2-2.5" />
    <path d="m9.5 14.5h3" />
    <path d="M15.5 12v5" />
  </svg>
);

export const GeminiIcon = (props: React.SVGProps<SVGSVGElement>) => {
    const id = React.useId();
    return (
        <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <defs>
                <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" />
                    <stop offset="100%" stopColor="hsl(var(--secondary))" />
                </linearGradient>
            </defs>
            <path
                d="M15.5 12C15.5 11.5953 15.4214 11.1953 15.2721 10.8236C15.1228 10.4519 14.9066 10.1184 14.6364 9.84818C14.3662 9.57797 14.0327 9.36179 13.661 9.21245C13.2893 9.06312 12.8893 8.98448 12.4846 8.98448C12.0799 8.98448 11.6799 9.06312 11.3082 9.21245C10.9365 9.36179 10.603 9.57797 10.3328 9.84818C10.0626 10.1184 9.84638 10.4519 9.69705 10.8236C9.54772 11.1953 9.46908 11.5953 9.46908 12C9.46908 12.4047 9.54772 12.8047 9.69705 13.1764C9.84638 13.5481 10.0626 13.8816 10.3328 14.1518C10.603 14.422 10.9365 14.6382 11.3082 14.7875C11.6799 14.9369 12.0799 15.0155 12.4846 15.0155C12.8893 15.0155 13.2893 14.9369 13.661 14.7875C14.0327 14.6382 14.3662 14.422 14.6364 14.1518C14.9066 13.8816 15.1228 13.5481 15.2721 13.1764C15.4214 12.8047 15.5 12.4047 15.5 12Z"
                stroke={`url(#${id})`}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
            <path
                d="M3.75012 12C3.75012 16.5513 7.69887 20.5 12.2501 20.5C16.8014 20.5 20.7501 16.5513 20.7501 12C20.7501 7.44871 16.8014 3.5 12.2501 3.5C7.69887 3.5 3.75012 7.44871 3.75012 12Z"
                stroke={`url(#${id})`}
                strokeWidth="2"
                fill="none"
            />
        </svg>
    )
};
