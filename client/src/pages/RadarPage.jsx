import BeautyRadar from "../components/BeautyRadar.jsx";

function RadarPage({ radarState, hasFavorites }) {
  return (
    <div className="page page--radar" data-page="radar">
      <BeautyRadar state={radarState} hasFavorites={hasFavorites} />
    </div>
  );
}

export default RadarPage;
