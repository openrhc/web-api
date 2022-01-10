import { getAllUnit, getSystemAllLoadedUnits, getCpuTemp } from './utils.js'

// 所有服务单元
let units = {}

// 已加载服务列表
let loadedUnits = []

// 温度列表
let tempList = []

export function getUnits() {
    return units
}
export function setUnits(_units) {
    units = _units
}

export function getLoadedUnits() {
    return loadedUnits
}
export function setLoadedUnits(_units) {
    loadedUnits = _units
}

export function getTempList() {
    return tempList
}

async function updateTemp() {
    const [err, temp] = await getCpuTemp()
    if (temp) {
        tempList.push(temp)
    }
}

(async () => {
    // updateTemp()
    // setInterval(updateTemp, 5000)
    const [err, _units] = await getAllUnit()
    if (units) {
        units = _units
    }
    const [err1, _loadedUnits] = await getSystemAllLoadedUnits()
    if (units) {
        loadedUnits = _loadedUnits
    }
})()
