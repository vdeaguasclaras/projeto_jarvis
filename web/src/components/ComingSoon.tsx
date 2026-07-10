type Props = {
  title: string;
  info?: { marco: string; entrega: string };
};

export default function ComingSoon({ title, info }: Props) {
  return (
    <div className="view-in">
      <div className="soon">
        <h2>{title} — em construção</h2>
        <p>{info?.entrega ?? "Especificado no protótipo v6; entra nos próximos marcos da fase."}</p>
        <span className="chip">{info?.marco ?? "Fase 1"}</span>
        <span className="chip muted">especificação: prototipos/prototipo-v6.html</span>
      </div>
    </div>
  );
}
