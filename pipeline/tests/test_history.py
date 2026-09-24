import json
import zipfile

from unbox_box_pipeline import history


def write_zip(path):
    tables = {
        "countries": "id,alpha2Code,alpha3Code,iocCode,name,demonym,continentId\nitaly,IT,ITA,ITA,Italy,Italian,europe\n",
        "drivers": (
            "id,name,firstName,lastName,fullName,abbreviation,permanentNumber,gender,dateOfBirth,"
            "dateOfDeath,placeOfBirth,countryOfBirthCountryId,nationalityCountryId,"
            "secondNationalityCountryId,bestChampionshipPosition,bestStartingGridPosition,"
            "bestRaceResult,bestSprintRaceResult,totalChampionshipWins,totalRaceEntries,"
            "totalRaceStarts,totalRaceWins,totalRaceLaps,totalPodiums,totalPoints,"
            "totalChampionshipPoints,totalPolePositions,totalFastestLaps,totalSprintRaceStarts,"
            "totalSprintRaceWins,totalDriverOfTheDay,totalGrandSlams\n"
            "a,Ann A,Ann,A,Ann A,AAA,,F,1990-01-01,,,italy,italy,,1,1,1,,1,2,2,1,0,2,43,43,1,1,0,0,0,0\n"
            "b,Bob B,Bob,B,Bob B,BBB,,M,1991-01-01,,,italy,italy,,2,2,2,,0,2,1,0,0,1,18,18,0,0,0,0,0,0\n"
        ),
        "constructors": (
            "id,name,fullName,countryId,bestChampionshipPosition,totalChampionshipWins,"
            "totalRaceStarts,totalRaceWins,total1And2Finishes,totalPodiums,totalPoints,"
            "totalPolePositions,totalFastestLaps\n"
            "team,Team,Team Racing,italy,1,1,3,1,1,2,61,1,1\n"
        ),
        "constructors-chronology": (
            "parentConstructorId,positionDisplayOrder,constructorId,yearFrom,yearTo\n"
            "team,1,team,2024,\n"
        ),
        "races-driver-standings": (
            "raceId,year,round,positionDisplayOrder,positionNumber,positionText,driverId,points,"
            "positionsGained,championshipWon\n"
            "1,2024,1,1,1,1,a,25,,true\n"
            "1,2024,1,2,2,2,b,18,,false\n"
            "2,2025,1,1,1,1,a,18,,false\n"
        ),
        "races-constructor-standings": (
            "raceId,year,round,positionDisplayOrder,positionNumber,positionText,constructorId,"
            "engineManufacturerId,points,positionsGained,championshipWon\n"
            "1,2024,1,1,1,1,team,x,43,,true\n"
        ),
        "seasons-constructor-standings": (
            "year,positionDisplayOrder,positionNumber,positionText,constructorId,"
            "engineManufacturerId,points,championshipWon\n"
            "2024,1,1,1,team,x,43,true\n"
        ),
        "circuits": "id,name,fullName,previousNames,type,direction,placeName,countryId,latitude,longitude,length,turns,totalRacesHeld\nmonza,Monza,Autodromo Nazionale Monza,,RACE,CLOCKWISE,Monza,italy,45.6,9.28,5.793,11,2\n",
        "races-fastest-laps": (
            "raceId,year,round,positionDisplayOrder,positionNumber,positionText,driverId,constructorId,lap,time,timeMillis\n"
            "1,2024,1,1,1,1,a,team,40,1:21.046,81046\n"
            "2,2025,1,1,1,1,b,team,41,1:20.901,80901\n"
            "2,2025,1,2,2,2,a,team,40,1:21.500,81500\n"
        ),
        "grands-prix": "id,name,fullName,shortName,abbreviation,countryId,totalRacesHeld\nitaly,Italian,Italian GP,Italy,ITA,italy,2\n",
        "races": (
            "id,year,round,date,grandPrixId,officialName,circuitId,circuitLayoutId,laps\n"
            "1,2024,1,2024-09-01,italy,x,monza,monza-7,53\n"
            "2,2025,1,2025-09-07,italy,y,monza,monza-7,53\n"
            "3,2026,1,2026-09-06,italy,z,monza,monza-7,53\n"
        ),
        "races-race-results": (
            "raceId,year,round,positionNumber,positionText,driverId,constructorId,points,polePosition,gridPositionNumber,fastestLap\n"
            "1,2024,1,1,1,a,team,25,true,1,true\n"
            "1,2024,1,2,2,b,team,18,false,2,false\n"
            "2,2025,1,2,2,a,team,18,false,2,false\n"
            "2,2025,1,,DNQ,b,team,0,false,,false\n"
        ),
        "seasons-driver-standings": "year,positionDisplayOrder,positionNumber,positionText,driverId,points,championshipWon\n2024,1,1,1,a,25,true\n",
    }
    with zipfile.ZipFile(path, "w") as zf:
        for name, text in tables.items():
            zf.writestr(f"f1db-{name}.csv", text)


def test_build_history_writes_compact_columns(tmp_path, monkeypatch):
    zpath = tmp_path / "f1db.zip"
    write_zip(zpath)
    monkeypatch.setattr(history, "download", lambda version=None: (zipfile.ZipFile(zpath), "vTest"))
    report = history.build_history(tmp_path)
    assert report["races"] == 2  # race 3 has no results yet
    index = json.loads((tmp_path / "history" / "index.json").read_text())
    results = json.loads((tmp_path / "history" / "results.json").read_text())
    assert index["source"]["version"] == "vTest"
    assert index["champions"] == [{"year": 2024, "driver": 0}]
    ann, bob = index["drivers"]
    assert (ann["firstYear"], ann["lastYear"], ann["active"]) == (2024, 2025, True)
    assert (bob["firstYear"], bob["lastYear"], bob["active"]) == (2024, 2024, False)
    assert len(results["race"]) == 3  # the DNQ is not a start
    assert results["pole"] == [1, 0, 0]


def test_build_history_writes_profiles_and_round_standings(tmp_path, monkeypatch):
    zpath = tmp_path / "f1db.zip"
    write_zip(zpath)
    monkeypatch.setattr(history, "download", lambda version=None: (zipfile.ZipFile(zpath), "vTest"))
    history.build_history(tmp_path)
    index = json.loads((tmp_path / "history" / "index.json").read_text())
    standings = json.loads((tmp_path / "history" / "standings.json").read_text())
    team = index["constructors"][0]
    assert (team["name"], team["country"], team["wins"], team["titles"], team["oneTwos"]) == (
        "Team",
        "Italian",
        1,
        1,
        1,
    )
    assert index["constructorChampions"] == [{"year": 2024, "constructor": 0}]
    assert index["lineage"] == [{"parent": 0, "constructor": 0, "from": 2024, "to": None}]
    assert index["drivers"][0]["bestChampionship"] == 1
    # After each round: race index, driver/constructor index, position, points.
    assert standings["drivers"] == {
        "race": [0, 0, 1],
        "id": [0, 1, 0],
        "pos": [1, 2, 1],
        "points": [25.0, 18.0, 18.0],
    }
    assert standings["constructors"]["points"] == [43.0]


def test_build_history_writes_circuit_facts_records_and_calendar(tmp_path, monkeypatch):
    zpath = tmp_path / "f1db.zip"
    write_zip(zpath)
    monkeypatch.setattr(history, "download", lambda version=None: (zipfile.ZipFile(zpath), "vTest"))
    history.build_history(tmp_path)
    index = json.loads((tmp_path / "history" / "index.json").read_text())
    monza = index["circuits"][0]
    assert monza["fullName"] == "Autodromo Nazionale Monza"
    assert (monza["type"], monza["direction"], monza["length"], monza["turns"]) == (
        "RACE",
        "CLOCKWISE",
        5.793,
        11,
    )
    assert (monza["lat"], monza["lng"]) == (45.6, 9.28)
    # The race lap record on the current layout: the fastest of each race's fastest laps.
    assert index["lapRecords"] == [
        {"circuit": 0, "time": 80.901, "driver": 1, "year": 2025, "current": True}
    ]
    # Races with no results yet are the upcoming calendar.
    assert index["calendar"] == [
        {"year": 2026, "round": 1, "name": "Italian", "circuit": 0, "date": "2026-09-06"}
    ]
