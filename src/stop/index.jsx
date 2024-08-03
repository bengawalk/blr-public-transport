import React from "react";
import _ from "lodash";
import { useParams} from "react-router-dom";
import {Icon} from "@iconify/react/dist/iconify.js";
import mapboxgl from "mapbox-gl";
import { MAPBOX_TOKEN, MAX_HISTORY_LENGTH, SEARCH_RESULT_TYPES } from "../utils/constants.js";

import IconBusStop from "../assets/icon_bus_stop.svg";
import BusStopRouteItem from "./bus-stop-route-item.jsx";
import { getStopDetailsApi } from "../utils/api.js";
import BottomTray from "../components/bottom_tray.jsx";
import PageBackButton from "../components/page_back_button.jsx";
import { afterMapLoad } from "../utils/index.js";

mapboxgl.accessToken = MAPBOX_TOKEN;

class StopPage extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      stopDetails: null,
      // lat: 12.977529081680132,
      // lng: 77.57247169985196,
      // zoom: 11,
      supported: mapboxgl.supported(),
      isFavourited: false,
    };
    this.mapContainer = React.createRef();
  }

  initMap = () => {
    if(!this.mapContainer.current) {
      return;
    }
    const { lng, lat, zoom } = this.state;
    const map = new mapboxgl.Map({
      container: this.mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [77.57247169985196, 12.977529081680132],
      zoom: 11,
      minZoom: 10,
      maxZoom: 18,
    });
    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();

    // map.on("move", () => {
    //   this.setState({
    //     lng: map.getCenter().lng.toFixed(4),
    //     lat: map.getCenter().lat.toFixed(4),
    //     zoom: map.getZoom().toFixed(2),
    //   });
    // });
    this.map = map;
  };

  componentDidMount() {
    this.getStopDetails();
    if (this.state.supported) {
      this.initMap();
      this.map?.on("load", () => {

      });
    }
  }

  componentWillUnmount() {
    this.map?.remove();
  }

  componentDidUpdate(prevProps) {
    if(prevProps.stopId !== this.props.stopId) {
      this.getStopDetails();
    }
  };

  getStopDetails = async () => {
    const { stopId } = this.props;
    const { data: { data: stopDetails }} = await getStopDetailsApi(stopId);
    const favourites = JSON.parse(localStorage.getItem("bpt_favourites") || "[]");
    this.setState({
      stopDetails,
      isFavourited: _.some(favourites, f => f.type === 'bus_stop' && f.id === stopDetails.stop_id),
    });

    // Add marker for the stop on the map
    afterMapLoad(this.map, () => {
      const sourceEl = document.createElement('div');
      sourceEl.className = 'destination-marker';
      new mapboxgl.Marker(sourceEl).setLngLat(stopDetails.stop_loc).addTo(this.map);
      this.map.flyTo({
        center: stopDetails.stop_loc,
        zoom: 17,
      });
    });

    // Add this bus stop to history
    const historyItems = JSON.parse(localStorage.getItem("bpt_history") || "[]");
    const newHistory = _.take(
      _.uniqBy(
          [
              { id: stopDetails.stop_id, text: stopDetails.stop_name, type: SEARCH_RESULT_TYPES.bus_stop },
              ...historyItems
          ],
          s => `${s.type}-${s.id}`,
      ),
      MAX_HISTORY_LENGTH,
    );
    localStorage.setItem("bpt_history", JSON.stringify(newHistory));

  }

  toggleFavourite = () => {
    const { stopDetails, isFavourited } = this.state;
    const currentFavourites = JSON.parse(localStorage.getItem("bpt_favourites") || "[]");
    let newFavourites = [];
    if(isFavourited) {
      newFavourites = _.filter(currentFavourites, f => !(f.type === "bus_stop"  && f.id === stopDetails.stop_id));
      this.setState({
        isFavourited: false,
      });
    } else {
      newFavourites = [
        { id: stopDetails.stop_id, text: stopDetails.stop_name, type: "bus_stop" },
        ...currentFavourites,
      ]
      this.setState({
        isFavourited: true,
      });
    }
    localStorage.setItem("bpt_favourites", JSON.stringify(newFavourites));
  };

  render() {
    const { stopDetails, isFavourited } = this.state;

    return (
      <>
        <div id="map" ref={this.mapContainer} className="map-container" />
        {
          !!stopDetails && (
            <>
              <PageBackButton />
              <BottomTray
                headerContent={(
                  <div id="page-heading">
                    <p>
                      <img src={IconBusStop} alt="" id="header-icon" />
                      { stopDetails.stop_name }
                    </p>
                    <button className="search-result-favourite" onClick={this.toggleFavourite}>
                      {
                        isFavourited ? (
                          <Icon icon="tabler:star-filled" color="#FFD027" width="16" height="16" />
                        ) : (
                          <Icon icon="tabler:star" color="#999999" width="16" height="16" />
                        )
                      }
                    </button>
                  </div>
                )}
              >
                <div className="bus-stop-page-list">
                  <h3 className="subheading">Buses through this stop</h3>
                  {
                    stopDetails.trips.map(b => <BusStopRouteItem info={b} key={b.route_id} />)
                  }
                </div>
              </BottomTray>
            </>
          )
        }
      </>
    );
  }
};

const StopPageWithParams = () => {
  const { stop_id: stopId } = useParams();
  return (
    <StopPage stopId={stopId} />
  )
}

export default StopPageWithParams;
