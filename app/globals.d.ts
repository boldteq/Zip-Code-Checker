declare module "*.css";

declare namespace JSX {
  interface IntrinsicElements {
    "s-save-bar": React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & { id: string },
      HTMLElement
    >;
    "s-app-nav": React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement>,
      HTMLElement
    >;
    "s-link": React.DetailedHTMLProps<
      React.AnchorHTMLAttributes<HTMLElement>,
      HTMLElement
    >;
  }
}
