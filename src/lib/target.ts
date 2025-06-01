export type Target = "tokyodome" | "vatican"

const targetPath: Record<string, string> = {
    tokyodome: "tokyodome.json",
    vatican: "vatican.json"
}

export const getTargetPath = (target: string) => {
    if (target in Object.keys(targetPath)) {
        return targetPath[target]
    }
    return targetPath["tokyodome"]
}
