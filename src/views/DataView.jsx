import HydrologicalChart from '../components/HydrologicalChart'
import AnnualTable from '../components/AnnualTable'

export default function DataView() {
  return (
    <section className="analysis-section">
      <div className="chart-panel">
        <h2>Hydrologischer Fingerabdruck</h2>
        <HydrologicalChart />
      </div>
      <div className="table-panel">
        <h2>Datentabelle 2018–2025</h2>
        <AnnualTable />
      </div>
    </section>
  )
}
