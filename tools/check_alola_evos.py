import json
import urllib.request

API = "https://pokeapi.co/api/v2"
FAMILIES = [
    "rattata",
    "pikachu",
    "sandshrew",
    "vulpix",
    "diglett",
    "meowth",
    "geodude",
    "grimer",
    "exeggcute",
    "cubone",
]


def get_json(url: str):
    with urllib.request.urlopen(url) as resp:
        return json.load(resp)


def extract_evo_edges(chain_node, out):
    src = chain_node["species"]["name"]
    for child in chain_node.get("evolves_to", []):
        dst = child["species"]["name"]
        details = child.get("evolution_details", [])
        out.append((src, dst, details))
        extract_evo_edges(child, out)


def summarize_detail(detail: dict) -> str:
    trigger = (detail.get("trigger") or {}).get("name")
    parts = [trigger] if trigger else []
    if detail.get("item"):
        parts.append(f"item={detail['item']['name']}")
    if detail.get("min_level"):
        parts.append(f"min_level={detail['min_level']}")
    if detail.get("min_happiness"):
        parts.append(f"min_happiness={detail['min_happiness']}")
    if detail.get("time_of_day"):
        parts.append(f"time_of_day={detail['time_of_day']}")
    if detail.get("location"):
        parts.append(f"location={detail['location']['name']}")
    return ", ".join(parts) or "(no fields)"


def main():
    for base in FAMILIES:
        species = get_json(f"{API}/pokemon-species/{base}")
        evo_chain_url = (species.get("evolution_chain") or {}).get("url")
        if not evo_chain_url:
            print(f"{base}: no evolution chain")
            continue

        chain = get_json(evo_chain_url)["chain"]
        edges = []
        extract_evo_edges(chain, edges)

        print(f"\n== {base} ==")
        for src, dst, details in edges:
            if src == dst:
                continue
            # print all detail variants for this edge
            if not details:
                print(f"{src} -> {dst}: (no details)")
                continue
            print(f"{src} -> {dst}:")
            for d in details:
                print(f"  - {summarize_detail(d)}")


if __name__ == "__main__":
    main()
