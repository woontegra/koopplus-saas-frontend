type PlaceholderPageProps = {
  title: string
}

export default function PlaceholderPage({ title }: PlaceholderPageProps): JSX.Element {
  return (
    <section className="data-panel">
      <div className="data-panel__header">
        <h1 className="data-panel__title">{title}</h1>
      </div>
      <div className="data-panel__body">
        <p className="placeholder-copy">
          Bu ekranın işlevleri sonraki aşamada masaüstü KoopPlus davranışına birebir taşınacak.
          Şu an yalnızca uygulama kabuğu ve menü iskeleti hazır.
        </p>
      </div>
    </section>
  )
}
