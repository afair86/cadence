import './placeholder-page.scss';

interface Props {
  title: string;
}

export default function PlaceholderPage({ title }: Props) {
  return (
    <div className="placeholder-page">
      <h1>{title}</h1>
      <p>Coming in the next MVP sprint.</p>
    </div>
  );
}
