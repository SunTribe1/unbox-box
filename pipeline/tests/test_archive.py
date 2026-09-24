import json
import zipfile

from tests.test_history import write_zip
from unbox_box_pipeline import archive, history

EXTRA = {
    "engine-manufacturers": "id,name,countryId,totalRaceStarts,totalRaceWins\nx,Xeng,italy,3,1\n",
    "tyre-manufacturers": "id,name,countryId,totalRaceStarts,totalRaceWins\npirelli,Pirelli,italy,3,1\n",
    "seasons-engine-manufacturers": "year,engineManufacturerId,positionNumber,totalRaceStarts,totalRaceWins\n2024,x,1,2,1\n2025,x,1,1,0\n",
    "engines": "id,engineManufacturerId,name,fullName,capacity,configuration,aspiration\ne1,x,E1,Xeng E1 1.6 V6 T H,1.6,V6,TURBOCHARGED_HYBRID\n",
    "chassis": "id,constructorId,name,fullName\nc1,team,T1,Team T1\n",
    "seasons-entrants-constructors": "year,entrantId,constructorId,engineManufacturerId\n2024,ent,team,x\n",
    "seasons-entrants-chassis": "year,entrantId,constructorId,engineManufacturerId,chassisId\n2024,ent,team,x,c1\n",
    "seasons-entrants-engines": "year,entrantId,constructorId,engineManufacturerId,engineId\n2024,ent,team,x,e1\n",
    "seasons-entrants-tyre-manufacturers": "year,entrantId,constructorId,engineManufacturerId,tyreManufacturerId\n2024,ent,team,x,pirelli\n",
    "seasons-entrants-drivers": "year,entrantId,constructorId,engineManufacturerId,driverId,rounds,roundsText,testDriver\n2024,ent,team,x,a,1,1,false\n",
    "entrants": "id,name\nent,Team Racing Entrant\n",
    "drivers-family-relationships": "parentDriverId,positionDisplayOrder,driverId,type\na,1,b,SIBLING\n",
    "races-qualifying-results": (
        "raceId,year,round,positionNumber,positionText,driverId,constructorId,q1Millis,q2Millis,q3Millis\n"
        "1,2024,1,1,1,a,team,80000,79500,79000\n"
    ),
    "races-pit-stops": "".join(
        ["raceId,year,round,driverId,constructorId,stop,lap,timeMillis\n"]
        + [f"1,2024,1,a,team,{i},{i * 5},{22000 + i * 10}\n" for i in range(1, 7)]
        + ["1,2024,1,b,team,7,40,60000\n"]  # a drive-through: dropped as an outlier
    ),
}


def build(tmp_path, monkeypatch):
    zpath = tmp_path / "f1db.zip"
    write_zip(zpath)
    with zipfile.ZipFile(zpath, "a") as zf:
        for name, text in EXTRA.items():
            zf.writestr(f"f1db-{name}.csv", text)
    monkeypatch.setattr(history, "download", lambda version=None: (zipfile.ZipFile(zpath), "vT"))
    history.build_history(tmp_path)
    return lambda name: json.loads((tmp_path / "history" / name).read_text())


def test_season_file_carries_every_session(tmp_path, monkeypatch):
    load = build(tmp_path, monkeypatch)
    season = load("seasons/2024.json")
    race = season["races"][0]
    assert race["round"] == 1 and race["laps"] == 53
    assert race["sessions"]["qualifying"][0]["q3"] == 79000
    assert race["sessions"]["race"][0]["pole"] is True
    assert "retired" not in race["sessions"]["race"][0]  # blanks are left out
    assert season["entries"][0]["entrant"] == "Team Racing Entrant"
    # Upcoming races (no results yet) still get a season file for the calendar.
    assert load("seasons/2026.json")["races"][0]["sessions"] == {}


def test_catalog_links_team_cars_and_families(tmp_path, monkeypatch):
    load = build(tmp_path, monkeypatch)
    cat = load("catalog.json")
    car = cat["teamSeasons"][0]
    assert car["chassis"] == ["T1"]
    assert car["engines"][0]["layout"] == "V6"
    assert car["tyres"] == [0]
    assert cat["engineMakers"][0]["firstYear"] == 2024
    assert cat["family"] == [{"driver": 1, "relative": 0, "type": "SIBLING"}]
    assert cat["countries"][0]["code"] == "IT"


def test_index_gains_flags_and_layouts(tmp_path, monkeypatch):
    load = build(tmp_path, monkeypatch)
    index = load("index.json")
    assert index["drivers"][0]["code"] == "IT"
    assert index["circuits"][0]["layouts"][0]["id"] == "monza-7"
    assert index["circuits"][0]["layouts"][0]["races"] == 2


def test_pit_crews_compare_to_race_median(tmp_path, monkeypatch):
    records = build(tmp_path, monkeypatch)("records.json")
    crew = records["pitCrews"][0]
    assert crew["stops"] == 6  # the 60 s drive-through is not a pit stop
    assert crew["year"] == 2024


def test_missing_tables_are_empty(tmp_path):
    reader = archive.optional_reader(zipfile.ZipFile(tmp_path / "empty.zip", "w"), None)
    assert reader("engines") == []
