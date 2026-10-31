const mockTrailData = [
    [38.112, 15.632, 200],
    [38.115, 15.635, 350]
]

export function normalizeCoordinates(trailData: number[][]) : number[][] {
    const cleanData = trailData.map((out) =>{

        const [lat, lng, ele] = out;
        
        return [lng, lat, ele]
    });

    return cleanData;
}

const cleanTrailData = normalizeCoordinates(mockTrailData);

console.log(cleanTrailData)