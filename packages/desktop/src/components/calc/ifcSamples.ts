/**
 * Minimal IFC sample snippets shown in the IFC tab.
 *
 * IFC4x3 — current ISO standard (ISO 16739-1:2024), STEP physical file format (SPF).
 * IFCX   — draft next-gen schema using JSON-based serialization, layered/path data.
 */

export const ifc4x3Sample = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION (
  ('ViewDefinition [DesignTransferView_V1.0]'),
  '2;1');
FILE_NAME (
  'fundering.ifc',
  '2026-05-19T13:55:00',
  ('Maarten Vroegindeweij'),
  ('OpenAEC Foundation'),
  'Open Calculations Studio v0.1.0',
  'Open Calculations Studio Exporter',
  '');
FILE_SCHEMA (('IFC4X3_ADD2'));
ENDSEC;

DATA;
#1  = IFCPROJECT('0Wn0DG6S$AvgJDqAB57wpu',$,'Woning Laageind 57',$,$,$,$,(#11),#5);
#2  = IFCSITE('1eO6sMwFb7uvVa6xUyl4Yy',$,'Site',$,$,#13,$,$,.ELEMENT.,$,$,$,$,$);
#3  = IFCBUILDING('2vN5_X4Hv7Mhhfxr_BB7n_',$,'Hoofdgebouw',$,$,#15,$,$,.ELEMENT.,$,$,$);
#4  = IFCBUILDINGSTOREY('3sH8w$Pkz4wPNn7P2HHkB1',$,'Begane grond',$,$,#17,$,$,.ELEMENT.,0.);
#5  = IFCUNITASSIGNMENT((#6,#7,#8));
#6  = IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);
#7  = IFCSIUNIT(*,.FORCEUNIT.,.KILO.,.NEWTON.);
#8  = IFCSIUNIT(*,.PRESSUREUNIT.,.MEGA.,.PASCAL.);

/* Funderingspaal — toegevoegd door Open Calculations Studio na paaldraagvermogen toetsing */
#100 = IFCPILE('4mJ_ZkRPzAYwG3p1U2W5l8',$,'Paal P1',
        'Houten paal, geheid, D=150 mm, L=11 m','EN 1995 + NEN 9997',
        #101,#102,'P1',.COHESION.,.FRICTION.,$);
#101 = IFCLOCALPLACEMENT(#17,#103);
#102 = IFCPRODUCTDEFINITIONSHAPE($,$,(#104));

ENDSEC;
END-ISO-10303-21;
`;

export const ifcxSample = `{
  "@context": "https://standards.buildingsmart.org/IFC/IFCX/0.1/context.jsonld",
  "@type": "IfcxFile",
  "header": {
    "name": "fundering.ifcx",
    "description": "Funderingsadvies — woning Laageind 57",
    "originatingSystem": "Open Calculations Studio v0.1.0",
    "preprocessor": "Open Calculations Studio IFCX exporter",
    "timestamp": "2026-05-19T13:55:00Z",
    "schema": "ifcx:0.1",
    "author": "Maarten Vroegindeweij",
    "organization": "OpenAEC Foundation"
  },
  "data": [
    {
      "path": "/project",
      "type": "Project",
      "name": "Woning Laageind 57",
      "longName": "Woning en bijgebouw Laageind 57 Driebruggen",
      "units": {
        "length": "mm",
        "force": "kN",
        "stress": "MPa"
      }
    },
    {
      "path": "/project/site",
      "type": "Site",
      "name": "Site",
      "geographicLocation": {
        "latitude": 52.0211,
        "longitude": 4.7256,
        "elevation": -1.0
      }
    },
    {
      "path": "/project/site/building",
      "type": "Building",
      "name": "Hoofdgebouw"
    },
    {
      "path": "/project/site/building/storey/0",
      "type": "BuildingStorey",
      "name": "Begane grond",
      "elevation": 0.0
    },
    {
      "path": "/project/site/foundation/pile/P1",
      "type": "Pile",
      "name": "Paal P1",
      "predefinedType": "COHESION_FRICTION",
      "constructionType": "Houten paal, geheid",
      "properties": {
        "diameter_eq_mm": 150,
        "length_m": 11.0,
        "head_level_NAP_m": -1.0,
        "tip_level_NAP_m": -12.0
      },
      "verification": {
        "standard": "NEN 9997-1 §7",
        "Rcnetd_kN": 154.3,
        "NEd_kN": 130.0,
        "unityCheck": 0.84,
        "result": "PASS"
      },
      "source": "Open Calculations Studio — paaldraagvermogen.ifc-calculation"
    }
  ]
}
`;
